import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ModelConfig } from '@type/chat';
import { ProviderKey } from '@type/chat';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { debug } from '@utils/debug';

interface ModelSelectorProps {
  provider: ProviderKey;
  setProvider: (provider: ProviderKey) => void;
  modelConfig: ModelConfig;
  setModelConfig?: (config: ModelConfig) => void;
  updateModelConfig?: (update: Partial<ModelConfig>) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  provider,
  setProvider,
  modelConfig,
  setModelConfig,
  updateModelConfig
}) => {
  const { t } = useTranslation('model');
  const [providerDropDown, setProviderDropDown] = useState<boolean>(false);
  const [modelDropDown, setModelDropDown] = useState<boolean>(false);
  
  // Debug logging
  useEffect(() => {
    debug.log('ui', 'ModelSelector props:', { 
      provider, 
      modelConfig,
      hasSetModelConfig: !!setModelConfig,
      hasUpdateModelConfig: !!updateModelConfig
    });
  }, [provider, modelConfig, setModelConfig, updateModelConfig]);
  
  // Safely get provider info with error handling
  const getProviderInfo = () => {
    try {
      if (!provider) {
        debug.error('ui', 'ModelSelector: provider is undefined or null');
        return null;
      }
      
      const info = ProviderRegistry.getProvider(provider);
      debug.log('ui', `Provider info for ${provider}:`, info);
      return info;
    } catch (error) {
      debug.error('ui', `Error getting provider info for ${provider}:`, error);
      return null;
    }
  };
  
  // Get provider info
  const providerInfo = getProviderInfo();
  
  // Handle model config updates
  const handleModelChange = (modelId: string) => {
    debug.log('ui', `Changing model to: ${modelId}`);
    
    if (!providerInfo) {
      debug.error('ui', 'Cannot change model: provider info is null');
      return;
    }
    
    const modelInfo = providerInfo.models.find(m => m.id === modelId);
    
    if (!modelInfo) {
      debug.error('ui', `Model ${modelId} not found in provider ${provider}`);
      return;
    }
    
    debug.log('ui', `Found model info:`, modelInfo);
    
    const updatedConfig = {
      ...modelConfig,
      model: modelId,
      max_tokens: modelInfo.maxCompletionTokens || modelConfig.max_tokens
    };
    
    debug.log('ui', 'Updated model config:', updatedConfig);
    
    if (setModelConfig) {
      debug.log('ui', 'Using setModelConfig to update');
      setModelConfig(updatedConfig);
    } else if (updateModelConfig) {
      debug.log('ui', 'Using updateModelConfig to update');
      updateModelConfig({
        model: modelId,
        max_tokens: modelInfo.maxCompletionTokens || modelConfig.max_tokens
      });
    } else {
      debug.error('ui', 'No update function provided');
    }
    
    setModelDropDown(false);
  };
  
  // Handle provider change
  const handleProviderChange = (newProvider: ProviderKey) => {
    debug.log('ui', `Changing provider to: ${newProvider}`);
    setProvider(newProvider);
    
    try {
      // Get default model for new provider
      const newProviderInfo = ProviderRegistry.getProvider(newProvider);
      debug.log('ui', `New provider info:`, newProviderInfo);
      
      if (newProviderInfo && newProviderInfo.models && newProviderInfo.models.length > 0) {
        const defaultModel = newProviderInfo.models[0];
        debug.log('ui', `Default model for ${newProvider}:`, defaultModel);
        
        if (defaultModel) {
          handleModelChange(defaultModel.id);
        }
      } else {
        debug.error('ui', `No models found for provider ${newProvider}`);
      }
    } catch (error) {
      debug.error('ui', `Error changing provider to ${newProvider}:`, error);
    }
    
    setProviderDropDown(false);
  };
  
  // If provider info is null, show a fallback UI
  if (!providerInfo) {
    debug.error('ui', 'Rendering fallback UI due to missing provider info');
    return (
      <div className="mb-4">
        <div className="text-red-500 p-2 border border-red-300 rounded">
          Error: Could not load provider information for "{provider}".
          Please check your configuration.
        </div>
      </div>
    );
  }
  
  // Get available providers safely
  const availableProviders = (() => {
    try {
      // Get providers from registry
      const providers = ProviderRegistry.getProviders();
      debug.log('ui', 'Available providers:', providers);
      
      // If providers is undefined or null, return an empty object
      if (!providers) {
        debug.error('ui', 'ProviderRegistry.getProviders() returned null or undefined');
        return {};
      }
      
      return providers;
    } catch (error) {
      debug.error('ui', 'Error getting available providers:', error);
      return {};
    }
  })();
  
  return (
    <div className="mb-4">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          {t('provider.label')}
        </label>
        <div className="relative">
          <button
            className="flex items-center justify-between w-full px-3 py-2 text-left border rounded-md"
            onClick={() => setProviderDropDown(!providerDropDown)}
          >
            <span>{providerInfo?.name || provider}</span>
            <span>▼</span>
          </button>
          
          {providerDropDown && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg dark:bg-gray-700">
              {Object.keys(availableProviders || {}).map(key => (
                <div
                  key={key}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleProviderChange(key as ProviderKey)}
                >
                  {ProviderRegistry.getProvider(key as ProviderKey)?.name || key}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('model.label')}
        </label>
        <div className="relative">
          <button
            className="flex items-center justify-between w-full px-3 py-2 text-left border rounded-md"
            onClick={() => setModelDropDown(!modelDropDown)}
          >
            <span>{modelConfig.model}</span>
            <span>▼</span>
          </button>
          
          {modelDropDown && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg dark:bg-gray-700">
              {providerInfo.models.map(model => (
                <div
                  key={model.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleModelChange(model.id)}
                >
                  {model.name || model.id}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;