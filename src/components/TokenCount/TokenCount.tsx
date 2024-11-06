import React, { useEffect, useMemo, useState } from 'react';
import useStore from '@store/store';
import { shallow } from 'zustand/shallow';
import countTokens from '@utils/messageUtils';
import { providers } from '@type/providers';

const TokenCount = React.memo(() => {
  const [tokenCount, setTokenCount] = useState<number>(0);
  const generating = useStore((state) => state.generating);
  const provider = useStore((state) => state.provider);
  const messages = useStore(
    (state) =>
      state.chats ? state.chats[state.currentChatIndex].messages : [],
    shallow
  );

  const model = useStore((state) =>
    state.chats
      ? state.chats[state.currentChatIndex].config.model
      : providers[provider].models[0] // Use default model from current provider
  );

  const cost = useMemo(() => {
    const currentProvider = providers[provider];
    const modelCosts = currentProvider.costs[model];
    
    if (!modelCosts) {
      return '0.00'; // Return default value if cost not found
    }

    const price = modelCosts.price * 4.4 * (tokenCount / modelCosts.unit);
    return price.toPrecision(2);
  }, [model, tokenCount, provider]);

  useEffect(() => {
    if (!generating) setTokenCount(countTokens(messages, model));
  }, [messages, generating]);

  return (
    <div className='absolute top-[-16px] right-0'>
      <div className='text-xs italic text-gray-900 dark:text-gray-300'>
        Tokens: {tokenCount} &nbsp; {cost}zł
      </div>
    </div>
  );
});

export default TokenCount;
