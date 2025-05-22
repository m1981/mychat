import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModelConfig } from '@type/chat';
import { ProviderKey } from '@type/chat';
import { ProviderRegistry } from '@config/providers/provider.registry';

interface MaxTokenSliderProps {
  provider: ProviderKey;
  modelConfig: ModelConfig;
  updateModelConfig: (config: Partial<ModelConfig>) => void;
}

const MaxTokenSlider: React.FC<MaxTokenSliderProps> = ({
  provider,
  modelConfig,
  updateModelConfig,
}) => {
  const { t } = useTranslation('model');
  const providerConfig = ProviderRegistry.getProvider(provider);
  const currentModelConfig = providerConfig.models.find(m => m.id === modelConfig.model);

  const MIN_TOKENS = 100;
  // Ensure max_tokens doesn't exceed model's maxCompletionTokens
  const maxAllowedTokens = currentModelConfig?.maxCompletionTokens ?? 2048;

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-900 dark:text-white">
        {t('token.label')}: {modelConfig.max_tokens}
      </label>
      <input
        type="range"
        value={modelConfig.max_tokens}
        onChange={(e) => {
          const newMaxTokens = Number(e.target.value);
          updateModelConfig({
            max_tokens: newMaxTokens,
            // Ensure thinking budget doesn't exceed max_tokens
            capabilities: {
              ...modelConfig.capabilities,
              thinking_mode: {
                ...modelConfig.capabilities?.thinking_mode,
                budget_tokens: Math.min(
                  modelConfig.capabilities?.thinking_mode?.budget_tokens || 0,
                  newMaxTokens
                )
              }
            }
          });
        }}
        min={MIN_TOKENS}
        max={maxAllowedTokens}
        step={100}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="min-w-fit text-gray-500 dark:text-gray-300 text-xs mt-2">
        {t('token.description')}
      </div>
    </div>
  );
};

export default MaxTokenSlider;