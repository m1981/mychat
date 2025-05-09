import * as Sentry from '@sentry/react';
import { ModelConfig, MessageInterface } from '@type/chat';
import { ProviderKey } from '@type/chat';
import { providers } from '@type/providers';

export const getChatCompletion = async (
  providerKey: ProviderKey,
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
  customHeaders?: Record<string, string>
) => {
  const provider = providers[providerKey];
  if (!provider) {
    throw new Error(`Invalid provider: ${providerKey}`);
  }
  if (!provider.formatRequest) {
    throw new Error(`Provider ${providerKey} missing formatRequest implementation`);
  }

  const formattedRequest = provider.formatRequest(messages, { ...config, stream: false });

  // Only include the essential config properties
  const requestConfig = {
    model: formattedRequest.model,
    max_tokens: formattedRequest.max_tokens,
    temperature: formattedRequest.temperature,
    top_p: formattedRequest.top_p,
    stream: false
  };

  try {
  const response = await fetch(`/api/chat/${provider.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    body: JSON.stringify({
      messages: formattedRequest.messages,
      config: requestConfig,
      ...(apiKey ? { apiKey } : {})
    }),
  });

  if (!response.ok) throw new Error(await response.text());

  const data = await response.json();
  return provider.parseResponse(data);
  } catch (error) {
    Sentry.withScope((scope: Sentry.Scope) => {
      scope.setExtra('messages', messages);
      scope.setExtra('config', config);
      scope.setTag('endpoint', 'chat-completions');
      Sentry.captureException(error);
    });
    throw error;
  }
};
