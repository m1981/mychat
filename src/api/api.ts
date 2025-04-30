import * as Sentry from '@sentry/react';
import { ModelConfig, MessageInterface } from '@type/chat';
import { ProviderKey } from '@type/chat';
import { providers } from '@type/providers';
import { ENV } from '@config/env';

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
    // Determine API endpoint - use mock if in development mode and mock is enabled
    const endpoint = ENV.MOCK_API.ENABLED 
      ? `/api/chat/mock?provider=${provider.id}&delay=${ENV.MOCK_API.DELAY_MS}&messages=${ENV.MOCK_API.MESSAGES}`
      : `/api/chat/${provider.id}`;
      
    const response = await fetch(endpoint, {
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

// Add a flag to use the mock API
const USE_MOCK_API = true; // Set to false to use real API

export const getChatCompletionStream = async (
  providerKey: ProviderKey,
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
) => {
  const provider = providers[providerKey];
  const formattedRequest = provider.formatRequest(messages, { ...config, stream: true });

  // Use mock API if enabled
  const endpoint = USE_MOCK_API 
    ? `/api/chat/mock?provider=${providerKey}&delay=200&messages=50`
    : `/api/chat/${providerKey}`;

  return {
    url: endpoint,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formattedRequest,
        apiKey,
      }),
    }
  };
};