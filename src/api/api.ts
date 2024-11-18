import { ShareGPTSubmitBodyInterface } from '@type/api';
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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (apiKey) {
    headers[provider.id === 'anthropic' ? 'x-api-key' : 'Authorization'] = 
      provider.id === 'anthropic' ? apiKey : `Bearer ${apiKey}`;
  }

  const endpoint = useStore.getState().apiEndpoints[provider.id];
  const requestConfig: RequestConfig = {
    ...config,
    stream: false,
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(provider.formatRequest(messages, requestConfig)),
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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (apiKey) {
    if (provider.id === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['accept'] = 'text/event-stream';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  const endpoint = useStore.getState().apiEndpoints[provider.id];
  const requestConfig: RequestConfig = {
    ...config,
    stream: true,
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(provider.formatRequest(messages, requestConfig)),
  });

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 404 || response.status === 405) {
      if (text.includes('model_not_found')) {
        throw new Error(`${text}\nPlease ensure that you have access to the requested model.`);
      }
      throw new Error('Invalid API endpoint. Please check your configuration.');
    }

    if (response.status === 429) {
      throw new Error(`${text}\nRate limit exceeded. Please try again later.`);
    }

    if (text.includes('insufficient_quota')) {
      throw new Error(`${text}\nInsufficient quota. Please check your API key or endpoint.`);
    }

    throw new Error(text);
  }

  return response.body;
};

export const submitShareGPT = async (body: ShareGPTSubmitBodyInterface) => {
  const request = await fetch('https://sharegpt.com/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const { id } = await request.json();
  const url = `https://shareg.pt/${id}`;
  window.open(url, '_blank');
};