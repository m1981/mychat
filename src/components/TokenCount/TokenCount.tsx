import React, { useEffect, useMemo, useState } from 'react';
import useStore from '@store/store';
import { shallow } from 'zustand/shallow';
import countTokens from '@utils/messageUtils';
import { providers } from '@type/providers';

const TokenCount = React.memo(() => {
  const [tokenCount, setTokenCount] = useState<number>(0);
  const generating = useStore((state) => state.generating);
  const currentChat = useStore((state) => 
    state.chats ? state.chats[state.currentChatIndex] : null
  );
  const messages = useStore(
    (state) =>
      state.chats ? state.chats[state.currentChatIndex].messages : [],
    shallow
  );

  const { provider, model } = useMemo(() => {
    if (!currentChat) {
      return { provider: 'openai' as const, model: providers.openai.models[0] };
    }
    return {
      provider: currentChat.config.provider,
      model: currentChat.config.modelConfig.model,
    };
  }, [currentChat]);

  const cost = useMemo(() => {
    const currentProvider = providers[provider];
    const modelCosts = currentProvider.costs[model];
    
    if (!modelCosts) {
      return '0.00';
    }

    const price = modelCosts.price * 4.4 * (tokenCount / modelCosts.unit);
    return price.toPrecision(2);
  }, [model, tokenCount, provider]);

  useEffect(() => {
    if (!generating) setTokenCount(countTokens(messages, model));
  }, [messages, generating, model]);

  return (
    <div className='absolute top-[-16px] right-0'>
      <div className='text-xs italic text-gray-900 dark:text-gray-300'>
        Tokens: {tokenCount} &nbsp; {cost}zł
      </div>
    </div>
  );
});

export default TokenCount;
