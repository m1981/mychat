import { ModelConfig, MessageInterface } from '@type/chat';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ProviderKey } from '@type/chat';
import { AIProvider } from '@type/provider';

export const getChatCompletion = async (
  providerKey: ProviderKey,
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
  customHeaders?: Record<string, string>
) => {
  const provider = ProviderRegistry.getProvider(providerKey);
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
  provider: AIProvider,
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
  customHeaders?: Record<string, string>
) => {
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
}