import { ModelConfig, MessageInterface } from '@type/chat';
import { AIProvider, RequestConfig } from '@type/provider';
import useStore from '@store/store';

export const getChatCompletion = async (
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
      messages: provider.formatRequest(messages, { ...config, stream: false }).messages,
      config,
      apiKey,
    }),
  });

  if (!response.ok) throw new Error(await response.text());

  const data = await response.json();
  return provider.parseResponse(data);
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

  return response.body;
};