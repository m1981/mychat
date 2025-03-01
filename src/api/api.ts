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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    return Promise.reject(errorText);
  }

  const data = await response.json();
  return data.content;
};

export const getChatCompletionStream = async (
  providerKey: ProviderKey,
  messages: MessageInterface[],
  config: ModelConfig,
  apiKey?: string,
  customHeaders?: Record<string, string>
): Promise<ReadableStream<Uint8Array> | null> => {
  const provider = providers[providerKey];

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
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.details || 'Stream request failed';
    } catch (e) {
      errorMessage = errorText || 'Stream request failed';
    }
    return Promise.reject(errorMessage);
  }

  if (!response.body) {
    return Promise.reject('No response body received');
  }

  // Verify we're getting a stream
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('text/event-stream')) {
    const text = await response.text();
    console.error('Expected SSE stream but got:', contentType, text);
    return Promise.reject('Invalid response format');
  }

  return response.body;
};

// Helper function to parse SSE messages
export const parseSSEResponse = (chunk: string) => {
  const messages = chunk
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => line.slice(6));

  return messages.map(msg => {
    if (msg === '[DONE]') return { done: true };
    try {
      return JSON.parse(msg);
    } catch (e) {
      console.error('Failed to parse SSE message:', msg);
      return null;
    }
  }).filter(Boolean);
};
