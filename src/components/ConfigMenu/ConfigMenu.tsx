import React from 'react';
import PopupModal from '../PopupModal';
import { useChatConfig, useCapabilitySupport } from '@hooks/useConfiguration';
import { ThinkingModeToggle } from '@components/ConfigMenu/ThinkingModeToggle';
import ModelSelector from './ModelSelector';
import TemperatureSlider from './TemperatureSlider';
import MaxTokenSlider from './MaxTokenSlider';
import { useTranslation } from 'react-i18next';
import { capabilityRegistry } from '@capabilities/registry';

// Export these components for use in other files
export { ModelSelector, TemperatureSlider, MaxTokenSlider };

const ConfigMenu = ({
  setIsModalOpen,
  chatId,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatId: string;
}) => {
  const { t } = useTranslation('model');
  const {
    config,
    isLoading,
    updateConfig,
    updateModelConfig,
    updateCapability
  } = useChatConfig(chatId);

  // Show loading state if config is not yet loaded
  if (isLoading || !config) {
    return (
      <PopupModal
        title={t('configuration') as string}
        setIsModalOpen={setIsModalOpen}
      >
        <div className="p-6 text-center">Loading...</div>
      </PopupModal>
    );
  }

  const handleConfirm = () => {
    setIsModalOpen(false);
  };

  // Check capability support
  const isThinkingSupported = useCapabilitySupport(
    'thinking_mode', 
    config.provider, 
    config.modelConfig.model
  );
  
  const isFileUploadSupported = useCapabilitySupport(
    'file_upload', 
    config.provider, 
    config.modelConfig.model
  );

  return (
    <PopupModal
      title={t('configuration') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
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
        
        {isFileUploadSupported && (
          <FileUploadConfig
            config={config.modelConfig.capabilities?.file_upload}
            updateConfig={(update) => updateCapability('file_upload', update)}
          />
        )}
      </div>
    </PopupModal>
  );
};

export default ConfigMenu;