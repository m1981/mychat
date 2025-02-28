import React, { useEffect, useMemo, useState } from 'react';
import useStore from '@store/store';
import { shallow } from 'zustand/shallow';
import countTokens from '@utils/messageUtils';
import { ProviderRegistry } from '@config/providers/provider.registry';

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
      return { provider: 'openai' as const, model: ProviderRegistry.getProvider('openai').models[0].id };
    }
    return {
      provider: currentChat.config.provider,
      model: currentChat.config.modelConfig.model,
    };
  }, [currentChat]);

  const cost = useMemo(() => {
    const providerConfig = ProviderRegistry.getProvider(provider);
    const modelConfig = providerConfig.models.find(m => m.id === model);
    
    if (!modelConfig?.cost) {
      return '0.00';
    }

    // Handle new input/output cost structure
    if (modelConfig.cost.input && modelConfig.cost.output) {
      const inputTokens = tokenCount * 0.8;
      const outputTokens = tokenCount * 0.2;
      const inputCost = modelConfig.cost.input.price * (inputTokens / modelConfig.cost.input.unit);
      const outputCost = modelConfig.cost.output.price * (outputTokens / modelConfig.cost.output.unit);
      const totalCost = (inputCost + outputCost) * 4.4; // Convert to PLN
      return totalCost.toPrecision(2);
    }

    return '0.00';
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
