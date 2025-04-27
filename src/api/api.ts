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
  
  const formattedRequest = provider.formatRequest(messages, { ...config, stream: false });
  const requestConfig = {
    model: formattedRequest.model,
    max_tokens: formattedRequest.max_tokens,
    temperature: formattedRequest.temperature,
    top_p: formattedRequest.top_p,
    stream: false
  };

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
};

export const getChatCompletionStream = async (
  providerKey: ProviderKey,
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
) => {
  const provider = providers[providerKey];
  const formattedRequest = provider.formatRequest(messages, { ...config, stream: true });

  return {
    url: `/api/chat/${provider.id}`,
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