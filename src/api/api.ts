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
  const provider = providers[providerKey];  // Use providers map instead of ProviderRegistry
  const endpoint = provider.endpoints[0]; // Use first endpoint as default

  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    body: JSON.stringify({
      messages,
      config,
      apiKey,
    }),
  });

  if (!response.ok) throw new Error(await response.text());

  const data = await response.json();
  return data.content;
};

export const getChatCompletionStream = async (
  providerKey: ProviderKey,  // Change from AIProvider to ProviderKey
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
  customHeaders?: Record<string, string>
): Promise<ReadableStream | null> => {  // Add the => here
  const provider = providers[providerKey];  // Use providers map instead of ProviderRegistry

  const response = await fetch(`/api/chat/${provider.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    body: JSON.stringify({
      messages: provider.formatRequest(messages, { ...config, stream: true }).messages,
      config: { ...config, stream: true },
      apiKey,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  if (!response.body) {
    throw new Error('No response body received');
}

  return response.body;
}
