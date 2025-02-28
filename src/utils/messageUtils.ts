// src/utils/messageUtils.ts
import { Tiktoken } from '@dqbd/tiktoken/lite';

import { MessageInterface, ModelOptions } from '@type/chat';
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

export default countTokens;