import React, { useState, useEffect } from 'react';
import { useDefaultConfig, useCapabilitySupport } from '@hooks/useConfiguration';
import ModelSelector from '@components/ConfigMenu/ModelSelector';
import TemperatureSlider from '@components/ConfigMenu/TemperatureSlider';
import MaxTokenSlider from '@components/ConfigMenu/MaxTokenSlider';
import { ThinkingModeToggle } from '@components/ConfigMenu/ThinkingModeToggle';
import PopupModal from '@components/PopupModal';
import { useTranslation } from 'react-i18next';
import { debug } from '@utils/debug';

const ChatConfigMenu = () => {
  const { t } = useTranslation('model');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  debug.log('ui', 'Rendering ChatConfigMenu');
  
  return (
    <div>
      <button 
        className='btn btn-neutral' 
        onClick={() => {
          debug.log('ui', 'Opening ChatConfigMenu modal');
          setIsModalOpen(true);
        }}
      >
        {t('defaultChatConfig')}
      </button>
      {isModalOpen && <ChatConfigPopup setIsModalOpen={setIsModalOpen} />}
    </div>
  );
};

const ChatConfigPopup = ({
  setIsModalOpen,
}) => {
  const { t } = useTranslation('model');
  
  debug.log('ui', 'Rendering ChatConfigPopup');
  
  // Always call hooks at the top level
  const {
    config,
    systemMessage,
    isLoading,
    updateConfig,
    updateModelConfig,
    updateCapability,
    updateSystemMessage
  } = useDefaultConfig();
  
  debug.log('ui', 'ChatConfigPopup: useDefaultConfig returned', { 
    hasConfig: !!config,
    systemMessage,
    isLoading
  });
  
  if (config) {
    debug.log('ui', 'ChatConfigPopup: config details', {
      provider: config.provider,
      model: config.modelConfig.model,
      capabilities: Object.keys(config.modelConfig.capabilities || {})
    });
  }
  
  // Local state for system message
  const [localSystemMessage, setLocalSystemMessage] = useState('');
  
  // Initialize local state when config is loaded
  useEffect(() => {
    if (systemMessage) {
      setLocalSystemMessage(systemMessage);
    }
  }, [systemMessage]);
  
  // Check capability support - always call these hooks, even if config is null
  // We'll handle the null case inside the hook
  const isThinkingSupported = useCapabilitySupport(
    'thinking_mode', 
    config?.provider, 
    config?.modelConfig?.model
  );
  
  const isFileUploadSupported = useCapabilitySupport(
    'file_upload', 
    config?.provider, 
    config?.modelConfig?.model
  );
  
  useEffect(() => {
    if (config) {
      // Ensure capabilities is an object, not an array
      if (Array.isArray(config.modelConfig.capabilities)) {
        debug.log('ui', 'WARN: Config capabilities is an array, converting to object');
        updateModelConfig({
          capabilities: {}
        });
      } else if (!config.modelConfig.capabilities) {
        debug.log('ui', 'WARN: Config capabilities is null/undefined, initializing empty object');
        updateModelConfig({
          capabilities: {}
        });
      }
    }
  }, [config, updateModelConfig]);
  
  const handleConfirm = () => {
    if (updateSystemMessage) {
      updateSystemMessage(localSystemMessage);
    }
    setIsModalOpen(false);
  };
  
  // Render loading state or content
  if (isLoading || !config) {
    return (
      <PopupModal
        title={t('defaultChatConfig')}
        setIsModalOpen={setIsModalOpen}
      >
        <div className="p-6 text-center">Loading...</div>
      </PopupModal>
    );
  }
  
  // Render the full content when config is available
  return (
    <PopupModal
      title={t('defaultChatConfig')}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
            {t('systemMessage')}
          </label>
          <textarea
            className='w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            value={localSystemMessage}
            onChange={(e) => setLocalSystemMessage(e.target.value)}
            rows={4}
          />
        </div>
        
        <ModelSelector
          provider={config.provider}
          setProvider={(provider) => updateConfig({ provider })}
          modelConfig={config.modelConfig}
          updateModelConfig={updateModelConfig}
        />
        
        <MaxTokenSlider
          provider={config.provider}
          modelConfig={config.modelConfig}
          updateModelConfig={updateModelConfig}
        />
        
        <TemperatureSlider
          modelConfig={config.modelConfig}
          updateModelConfig={updateModelConfig}
        />
        
        {/* Capability-specific components */}
        {isThinkingSupported && (
          <ThinkingModeToggle
            modelConfig={config.modelConfig}
            setModelConfig={updateModelConfig}
            context={{ 
              provider: config.provider, 
              model: config.modelConfig.model,
              modelConfig: config.modelConfig
            }}
          />
        )}
        
      </div>
    </PopupModal>
  );
};

export default ChatConfigMenu;