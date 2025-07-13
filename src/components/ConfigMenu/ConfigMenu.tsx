import React, { useEffect, useState } from 'react';


import PopupModal from '@components/PopupModal';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { ProviderModel } from '@config/providers/provider.config';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ProviderKey } from '@type/provider';
import debug from 'debug';
import { useTranslation } from 'react-i18next';

import { validateMaxTokens, validateThinkingBudget } from '../../config/tokens/TokenConfig';

const ConfigMenu = ({
  setIsModalOpen,
  config,
  setConfig,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  config: ChatConfig;
  setConfig: (config: ChatConfig) => void;
}) => {
  // Ensure we have valid defaults if config is incomplete
  const defaultProvider = DEFAULT_PROVIDER;
  const [_provider, _setProvider] = useState<ProviderKey>(config?.provider || defaultProvider);
  
  // Create a safe initial model config with defaults
  const safeModelConfig = config?.modelConfig || {
    model: ProviderRegistry.getProvider(_provider).capabilities.defaultModel,
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0
  };
  
  const [_modelConfig, _setModelConfig] = useState<ModelConfig>(safeModelConfig);

  // Update local state when props change
  useEffect(() => {
    if (config?.provider) {
      _setProvider(config.provider);
    }
    if (config?.modelConfig) {
      _setModelConfig(config.modelConfig);
    }
  }, [config]);

  // Handle provider change
  const handleProviderChange = (provider: ProviderKey) => {
    _setProvider(provider);
    
    // Get default model for this provider
    const defaultModel = ProviderRegistry.getProvider(provider).capabilities.defaultModel;
    
    // Update model config with new provider and default model
    _setModelConfig({
      ..._modelConfig,
      model: defaultModel
    });
  };

  // Handle save
  const handleSave = () => {
    debug.log('ui', `[ConfigMenu] Saving configuration: provider=${_provider}, model=${_modelConfig.model}`);
    debug.log('ui', `[ConfigMenu] Full model config: ${JSON.stringify(_modelConfig)}`);
    
    try {
      // Validate token limits
      if (!_modelConfig.model) {
        debug.error('ui', '[ConfigMenu] Model is undefined, using default model for provider');
        // Get default model for this provider
        const defaultModel = ProviderRegistry.getProvider(_provider).capabilities.defaultModel;
        _modelConfig.model = defaultModel;
      }
      
      debug.log('ui', `[ConfigMenu] Validating max tokens for model "${_modelConfig.model}"`);
      const validatedMaxTokens = validateMaxTokens(_modelConfig.max_tokens, _modelConfig.model);
      debug.log('ui', `[ConfigMenu] Validated max tokens: ${validatedMaxTokens} (original: ${_modelConfig.max_tokens})`);
      
      // Create validated model config
      const validatedModelConfig = {
        ..._modelConfig,
        max_tokens: validatedMaxTokens
      };
      
      // If thinking is enabled, validate budget
      if (validatedModelConfig.thinking?.enabled) {
        debug.log('ui', `[ConfigMenu] Validating thinking budget: ${validatedModelConfig.thinking.budget_tokens}`);
        validatedModelConfig.thinking.budget_tokens = validateThinkingBudget(
          validatedModelConfig.thinking.budget_tokens,
          validatedMaxTokens
        );
        debug.log('ui', `[ConfigMenu] Validated thinking budget: ${validatedModelConfig.thinking.budget_tokens}`);
      }
      
      // Update config
      debug.log('ui', `[ConfigMenu] Setting final config: provider=${_provider}, model=${validatedModelConfig.model}`);
      setConfig({
        provider: _provider,
        modelConfig: validatedModelConfig
      });
      
      // Close modal
      setIsModalOpen(false);
    } catch (error) {
      debug.error('ui', `[ConfigMenu] Error saving configuration: ${error.message}`);
      // Show error to user
      alert(`Error saving configuration: ${error.message}`);
    }
  };

  return (
    <PopupModal
      title='Chat Settings'
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        <ModelSelector
          provider={_provider}
          setProvider={handleProviderChange}
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
  
  // Safely get provider information with fallbacks
  const currentProvider = ProviderRegistry.getProvider(provider);
  const providerConfig = ProviderRegistry.getProviderConfig(provider);
  const providerCapabilities = ProviderRegistry.getProviderCapabilities(provider);
  
  // Get available providers
  const availableProviders = ProviderRegistry.getAvailableProviders();
  
  // Check if current model is valid for this provider
  useEffect(() => {
    const isModelValid = providerConfig.models.some(
      (m: ProviderModel) => m.id === modelConfig?.model
    );
    
    if (!isModelValid) {
      const defaultModel = providerConfig.models[0];
      
      // Create base model config
      const newModelConfig: ModelConfig = {
        ...modelConfig,
        provider,
        model: defaultModel.id,
        max_tokens: defaultModel.maxCompletionTokens,
      };
      
      // Handle thinking mode based on provider capabilities
      if (providerCapabilities.supportsThinking) {
        newModelConfig.thinking = {
          enabled: modelConfig.thinking?.enabled ?? false,
          budget_tokens: modelConfig.thinking?.budget_tokens ?? 1000
        };
      } else {
        // For providers that don't support thinking, ensure thinking is undefined
        newModelConfig.thinking = undefined;
      }
      
      setModelConfig(newModelConfig);
    }
  }, [provider, modelConfig?.model]);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex justify-between'>
        <label className='block text-sm font-medium text-gray-900 dark:text-white'>
          Provider
        </label>
        <select
          className='bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
          value={provider}
          onChange={(e) => setProvider(e.target.value as ProviderKey)}
        >
          {availableProviders.map((key) => (
            <option key={key} value={key}>
              {ProviderRegistry.getProvider(key).name}
            </option>
          ))}
        </select>
      </div>
      <div className='flex justify-between'>
        <label className='block text-sm font-medium text-gray-900 dark:text-white'>
          Model
        </label>
        <select
          className='bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
          value={modelConfig?.model || providerCapabilities.defaultModel}
          onChange={(e) => setModelConfig({
            ...modelConfig,
            model: e.target.value
          })}
        >
          {providerConfig.models.map((m: ProviderModel) => (
            <option key={m.id} value={m.id}>
              {m.name || m.id}
            </option>
          ))}
        </select>
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
  const currentModelConfig = providerConfig.models.find(m => m.id === modelConfig?.model);

  const MIN_TOKENS = 100;
  // Ensure max_tokens doesn't exceed model's maxCompletionTokens with fallback
  const maxAllowedTokens = currentModelConfig?.maxCompletionTokens ?? 2048;

  return (
    <div>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('token.label')}: {modelConfig?.max_tokens || MIN_TOKENS}
      </label>
      <input
        type='range'
        value={modelConfig?.max_tokens || MIN_TOKENS}
        onChange={(e) => {
          const newMaxTokens = Number(e.target.value);
          setModelConfig({
            ...modelConfig,
            max_tokens: newMaxTokens,
            // Ensure thinking budget doesn't exceed max_tokens if thinking exists
            ...(modelConfig?.thinking ? {
              thinking: {
                ...modelConfig.thinking,
                budget_tokens: Math.min(
                  modelConfig.thinking.budget_tokens,
                  newMaxTokens
                )
              }
            } : {})
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
  
  // Safely get provider capabilities with fallback
  const providerCapabilities = ProviderRegistry.getProviderCapabilities(modelConfig?.provider);
  
  // If provider doesn't support thinking, don't render the component
  if (!providerCapabilities.supportsThinking) {
    return null;
  }

  // Ensure thinking config exists with defaults
  const thinking = modelConfig?.thinking ?? { enabled: false, budget_tokens: 0 };
  
  const handleThinkingToggle = (enabled: boolean) => {
    setModelConfig({
      ...modelConfig,
      thinking: {
        enabled,
        budget_tokens: enabled 
          ? Math.min(1000, modelConfig.max_tokens || 4096)
          : 0
      }
    });
  };

  const handleBudgetChange = (budget: number) => {
    setModelConfig({
      ...modelConfig,
      thinking: {
        ...thinking,
        budget_tokens: Math.min(budget, modelConfig.max_tokens || 4096)
      }
    });
  };
  
  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          {t('thinkingMode')}
        </label>
        <input
          type="checkbox"
          checked={thinking.enabled}
          onChange={(e) => handleThinkingToggle(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>
      
      {thinking.enabled && (
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('thinkingBudget')}
          </label>
          <input
            type="number"
            value={thinking.budget_tokens}
            onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
            min={100}
            max={modelConfig.max_tokens || 4096}
            step={100}
            className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
};

export default ConfigMenu;