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
  const endpoint = provider.endpoints[0];
  const formattedRequest = provider.formatRequest(messages, { ...config, stream: false });

  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    body: JSON.stringify({
      ...formattedRequest,
      apiKey,
    }),
  });

  if (!response.ok) throw new Error(await response.text());

  const data = await response.json();
  return data.content;
};

export const getChatCompletionStream = async (
  providerKey: ProviderKey,
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
) => {
  const provider = providers[providerKey];
  const formattedRequest = provider.formatRequest(messages, { ...config, stream: true });

  // Return the URL and headers separately to work with our SSE hook
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