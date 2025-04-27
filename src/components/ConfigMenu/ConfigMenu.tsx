import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PopupModal from '@components/PopupModal';
import { ProviderModel } from '@config/providers/provider.config';
import { ProviderRegistry } from '@config/providers/provider.registry';
import DownChevronArrow from '@icon/DownChevronArrow';
import { ChatConfig, ModelConfig, ProviderKey } from '@type/chat';
import { providers } from '@type/providers';

const ConfigMenu = ({
  setIsModalOpen,
  config,
  setConfig,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  config: ChatConfig;
  setConfig: (config: ChatConfig) => void;
}) => {
  const [_provider, _setProvider] = useState<ProviderKey>(config.provider);
  const [_modelConfig, _setModelConfig] = useState<ModelConfig>(config.modelConfig);
  const { t } = useTranslation('model');

  const handleConfirm = () => {
    setConfig({
      provider: _provider,
      modelConfig: _modelConfig,
    });
    setIsModalOpen(false);
  };

  return (
    <PopupModal
      title={t('configuration') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        <ModelSelector
          provider={_provider}
          setProvider={_setProvider}
          modelConfig={_modelConfig}
          setModelConfig={_setModelConfig}
        />
        <MaxTokenSlider
          provider={_provider}
          modelConfig={_modelConfig}
          setModelConfig={_setModelConfig}
        />
        <TemperatureSlider
          modelConfig={_modelConfig}
          setModelConfig={_setModelConfig}
        />
        <TopPSlider
          modelConfig={_modelConfig}
          setModelConfig={_setModelConfig}
        />
        <PresencePenaltySlider
          modelConfig={_modelConfig}
          setModelConfig={_setModelConfig}
        />
        <FrequencyPenaltySlider
          modelConfig={_modelConfig}
          setModelConfig={_setModelConfig}
        />
        <ThinkingModeToggle
          modelConfig={_modelConfig}
          setModelConfig={_setModelConfig}
        />
      </div>
    </PopupModal>
  );
};

export const ModelSelector = ({
  provider,
  setProvider,
  modelConfig,
  setModelConfig,
}: {
  provider: ProviderKey;
  setProvider: (provider: ProviderKey) => void;
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const [dropDown, setDropDown] = useState<boolean>(false);
  const currentProvider = providers[provider];
  const providerConfig = ProviderRegistry.getProvider(provider);

  // Ensure selected model is valid for current provider
  useEffect(() => {
    if (!currentProvider.models.includes(modelConfig.model)) {
      const defaultModel = providerConfig.models[0];
      setModelConfig({
        ...modelConfig,
        model: defaultModel.id,
        max_tokens: defaultModel.maxCompletionTokens,
        // Ensure thinking mode properties are preserved
        enableThinking: modelConfig.enableThinking,
        thinkingConfig: {
          budget_tokens: modelConfig.thinkingConfig.budget_tokens
        }
      });
    }
  }, [provider]);

  return (
    <div className='mb-4'>
      <div className='flex gap-2 mb-2'>
        <select
          className='btn btn-neutral btn-small'
          value={provider}
          onChange={(e) => setProvider(e.target.value as ProviderKey)}
        >
          {Object.values(providers).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className='btn btn-neutral btn-small flex gap-1'
          type='button'
          onClick={() => setDropDown((prev) => !prev)}
        >
          {modelConfig.model}
          <DownChevronArrow />
        </button>
      </div>
      <div
        className={`${
          dropDown ? '' : 'hidden'
        } absolute z-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl...`}
      >
        <ul className='text-sm text-gray-700 dark:text-gray-200 p-0 m-0'>
          {providerConfig.models.map((m: ProviderModel) => (
            <li
              className='px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
              onClick={() => {
                setModelConfig({
                  ...modelConfig,
                  model: m.id,
                  max_tokens: m.maxCompletionTokens
                });
                setDropDown(false);
              }}
              key={m.id}
            >
              {m.id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const MaxTokenSlider = ({
  provider,
  modelConfig,
  setModelConfig,
}: {
  provider: ProviderKey;
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const { t } = useTranslation('model');
  const providerConfig = ProviderRegistry.getProvider(provider);
  const currentModelConfig = providerConfig.models.find(m => m.id === modelConfig.model);

  const MIN_TOKENS = 100;
  // Ensure max_tokens doesn't exceed model's maxCompletionTokens
  const maxAllowedTokens = currentModelConfig?.maxCompletionTokens ?? 2048;

  return (
    <div>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('token.label')}: {modelConfig.max_tokens}
      </label>
      <input
        type='range'
        value={modelConfig.max_tokens}
        onChange={(e) => {
          const newMaxTokens = Number(e.target.value);
          setModelConfig({
            ...modelConfig,
            max_tokens: newMaxTokens,
            // Ensure thinking budget doesn't exceed max_tokens
            thinkingConfig: {
              budget_tokens: Math.min(
                modelConfig.thinkingConfig.budget_tokens,
                newMaxTokens
              )
            }
          });
        }}
        min={MIN_TOKENS}
        max={maxAllowedTokens}
        step={100}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
    </div>
  );
};

export const TemperatureSlider = ({
  modelConfig,
  setModelConfig,
}: {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('temperature.label')}: {modelConfig.temperature}
      </label>
      <input
        type='range'
        value={modelConfig.temperature}
        onChange={(e) => {
          setModelConfig({
            ...modelConfig,
            temperature: Number(e.target.value),
          });
        }}
        min={0}
        max={2}
        step={0.1}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='min-w-fit text-gray-500 dark:text-gray-300 text-xs mt-2'>
        {t('temperature.description')}
      </div>
    </div>
  );
};

export const TopPSlider = ({
  modelConfig,
  setModelConfig,
}: {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('topP.label')}: {modelConfig.top_p}
      </label>
      <input
        type='range'
        value={modelConfig.top_p}
        onChange={(e) => {
          setModelConfig({
            ...modelConfig,
            top_p: Number(e.target.value),
          });
        }}
        min={0}
        max={1}
        step={0.05}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='min-w-fit text-gray-500 dark:text-gray-300 text-xs mt-2'>
        {t('topP.description')}
      </div>
    </div>
  );
};

export const PresencePenaltySlider = ({
  modelConfig,
  setModelConfig,
}: {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('presencePenalty.label')}: {modelConfig.presence_penalty}
      </label>
      <input
        type='range'
        value={modelConfig.presence_penalty}
        onChange={(e) => {
          setModelConfig({
            ...modelConfig,
            presence_penalty: Number(e.target.value),
          });
        }}
        min={-2}
        max={2}
        step={0.1}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='text-xs text-gray-500 dark:text-gray-300 mt-2'>
        {t('presencePenalty.description')}
      </div>
    </div>
  );
};

export const FrequencyPenaltySlider = ({
  modelConfig,
  setModelConfig,
}: {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('frequencyPenalty.label')}: {modelConfig.frequency_penalty}
      </label>
      <input
        type='range'
        value={modelConfig.frequency_penalty}
        onChange={(e) => {
          setModelConfig({
            ...modelConfig,
            frequency_penalty: Number(e.target.value),
          });
        }}
        min={-2}
        max={2}
        step={0.1}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='text-xs text-gray-500 dark:text-gray-300 mt-2'>
        {t('frequencyPenalty.description')}
      </div>
    </div>
  );
};

export const ThinkingModeToggle = ({
  modelConfig,
  setModelConfig,
}: {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const { t } = useTranslation('model');

  const handleThinkingToggle = (enabled: boolean) => {
    setModelConfig({
      ...modelConfig,
      enableThinking: enabled,
      thinkingConfig: {
        budget_tokens: enabled 
          ? Math.min(1000, modelConfig.max_tokens)
          : 0
      }
    });
  };

  const handleBudgetChange = (budget: number) => {
    setModelConfig({
      ...modelConfig,
      thinkingConfig: {
        budget_tokens: Math.min(budget, modelConfig.max_tokens)
      }
    });
  };

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <div className='flex items-center justify-between'>
        <label className='block text-sm font-medium text-gray-900 dark:text-white'>
          {t('thinking.label')}
        </label>
        <input
          type='checkbox'
          checked={modelConfig.enableThinking}
          onChange={(e) => handleThinkingToggle(e.target.checked)}
          className='toggle toggle-primary'
        />
      </div>
      
      {modelConfig.enableThinking && (
        <div className='mt-4'>
          <label className='block text-sm font-medium text-gray-900 dark:text-white'>
            {t('thinking.budget')}: {modelConfig.thinkingConfig.budget_tokens}
          </label>
          <input
            type='range'
            value={modelConfig.thinkingConfig.budget_tokens}
            onChange={(e) => handleBudgetChange(Number(e.target.value))}
            min={100}
            max={modelConfig.max_tokens} // Cap at max_tokens
            step={100}
            className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
          />
          <div className='min-w-fit text-gray-500 dark:text-gray-300 text-xs mt-2'>
            {t('thinking.description')}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigMenu;