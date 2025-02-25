// src/utils/messageUtils.ts
import { MessageInterface, ModelOptions } from '@type/chat';
import { ModelRegistry } from '@config/models/model.registry';
import { ProviderRegistry } from '@config/providers/provider.registry';

import { Tiktoken } from '@dqbd/tiktoken/lite';
const cl100k_base = await import('@dqbd/tiktoken/encoders/cl100k_base.json');

const encoder = new Tiktoken(
  cl100k_base.bpe_ranks,
  {
    ...cl100k_base.special_tokens,
    '<|im_start|>': 100264,
    '<|im_end|>': 100265,
    '<|im_sep|>': 100266,
  },
  cl100k_base.pat_str
);

// https://github.com/dqbd/tiktoken/issues/23#issuecomment-1483317174
export const getChatGPTEncoding = (
  messages: MessageInterface[],
  model: ModelOptions
) => {
  const isGpt3 = model === 'gpt-3.5-turbo';

  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serialized = [
    messages
      .map(({ role, content }) => {
        return `<|im_start|>${role}${roleSep}${content}<|im_end|>`;
      })
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  return encoder.encode(serialized, 'all');
};

const countTokens = (messages: MessageInterface[], model: ModelOptions) => {
  if (messages.length === 0) return 0;
  return getChatGPTEncoding(messages, model).length;
};

export const limitMessageTokens = (
  messages: MessageInterface[],
  limit: number,
  model: ModelOptions
): MessageInterface[] => {
  const limitedMessages: MessageInterface[] = [];
  let tokenCount = 0;

  const modelCapabilities = ModelRegistry.getModelCapabilities(model);
  const providerConfig = ProviderRegistry.getProvider(modelCapabilities.provider);
  const modelConfig = providerConfig.models.find(m => m.id === model);

  if (!modelConfig) {
    throw new Error(`Model ${model} not found in provider config`);
  }

  const maxInputTokens = Math.min(
    modelConfig.contextWindow - modelConfig.maxCompletionTokens,
    limit
  );

  for (let i = messages.length - 1; i >= 0; i--) {
    const count = countTokens([messages[i]], model);
    if (count + tokenCount > maxInputTokens) break;
    tokenCount += count;
    limitedMessages.unshift({ ...messages[i] });
  }

  return limitedMessages;
};

export default countTokens;
