import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PopupModal from '@components/PopupModal';
import { ChatConfig, ModelConfig, ProviderKey } from '@type/chat';
import DownChevronArrow from '@icon/DownChevronArrow';
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
  const [tempProvider, setTempProvider] = useState<ProviderKey>(config.provider);
  const [tempModelConfig, setTempModelConfig] = useState<ModelConfig>(config.modelConfig);
  const { t } = useTranslation('model');

  const handleConfirm = () => {
    setConfig({
      provider: tempProvider,
      modelConfig: tempModelConfig,
    });
    setIsModalOpen(false);
  };

  // When provider changes, ensure model is valid for new provider
  useEffect(() => {
    const currentProvider = providers[tempProvider];
    if (!currentProvider.models.includes(tempModelConfig.model)) {
      setTempModelConfig({
        ...tempModelConfig,
        model: currentProvider.models[0],
        max_tokens: currentProvider.maxTokens[currentProvider.models[0]],
      });
    }
  }, [tempProvider]);

  return (
    <PopupModal
      title={t('configuration') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        <ProviderSelector
          provider={tempProvider}
          setProvider={setTempProvider}
        />
        <ModelSelector
          provider={tempProvider}
          modelConfig={tempModelConfig}
          setModelConfig={setTempModelConfig}
        />
        <MaxTokenSlider
          modelConfig={tempModelConfig}
          setModelConfig={setTempModelConfig}
          provider={tempProvider}
        />
        <TemperatureSlider
          modelConfig={tempModelConfig}
          setModelConfig={setTempModelConfig}
        />
        <TopPSlider
          modelConfig={tempModelConfig}
          setModelConfig={setTempModelConfig}
        />
        <PresencePenaltySlider
          modelConfig={tempModelConfig}
          setModelConfig={setTempModelConfig}
        />
        <FrequencyPenaltySlider
          modelConfig={tempModelConfig}
          setModelConfig={setTempModelConfig}
        />
      </div>
    </PopupModal>
  );
};

const ProviderSelector = ({
  provider,
  setProvider,
}: {
  provider: ProviderKey;
  setProvider: (provider: ProviderKey) => void;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mb-4'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('provider')}
      </label>
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as ProviderKey)}
        className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
      >
        {Object.values(providers).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
};

const ModelSelector = ({
  provider,
  modelConfig,
  setModelConfig,
}: {
  provider: ProviderKey;
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const [dropDown, setDropDown] = useState<boolean>(false);
  const currentProvider = providers[provider];

  return (
    <div className='mb-4'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
        Model
      </label>
      <div className='relative'>
        <button
          className='btn btn-neutral btn-small flex gap-1 w-full justify-between'
          type='button'
          onClick={() => setDropDown((prev) => !prev)}
        >
          {modelConfig.model}
          <DownChevronArrow />
        </button>
        <div
          className={`${
            dropDown ? '' : 'hidden'
          } absolute z-10 w-full bg-white rounded-lg shadow-xl dark:bg-gray-700`}
        >
          <ul className='text-sm text-gray-700 dark:text-gray-200'>
            {currentProvider.models.map((model) => (
              <li
                key={model}
                className='px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer'
                onClick={() => {
                  setModelConfig({
                    ...modelConfig,
                    model,
                    max_tokens: currentProvider.maxTokens[model],
                  });
                  setDropDown(false);
                }}
              >
                {model}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const MaxTokenSlider = ({
  modelConfig,
  setModelConfig,
  provider,
}: {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
  provider: ProviderKey;
}) => {
  const { t } = useTranslation('model');
  const currentProvider = providers[provider];
  const maxTokens = currentProvider.maxTokens[modelConfig.model];

  return (
    <div className='mb-4'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('token.label')}: {modelConfig.max_tokens}
      </label>
      <input
        type='range'
        value={modelConfig.max_tokens}
        onChange={(e) => {
          setModelConfig({
            ...modelConfig,
            max_tokens: Number(e.target.value),
          });
        }}
        min={1000}
        max={maxTokens}
        step={1000}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='text-xs text-gray-500 dark:text-gray-300 mt-2'>
        {t('token.description')}
      </div>
    </div>
  );
};

const TemperatureSlider = ({
  modelConfig,
  setModelConfig,
}: {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mb-4'>
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
      <div className='text-xs text-gray-500 dark:text-gray-300 mt-2'>
        {t('temperature.description')}
      </div>
    </div>
  );
};

const TopPSlider = ({
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
      <div className='text-xs text-gray-500 dark:text-gray-300 mt-2'>
        {t('topP.description')}
      </div>
    </div>
  );
};

const PresencePenaltySlider = ({
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

const FrequencyPenaltySlider = ({
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

export default ConfigMenu;