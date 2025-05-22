import React from 'react';
import PopupModal from '@components/PopupModal';
import { useChatConfig } from '@hooks/useConfiguration';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { CapabilityRegistry } from '@config/capabilities/registry';
import ModelSelector from '@components/ModelSelector';
import TemperatureSlider from '@components/TemperatureSlider';
import MaxTokensInput from '@components/MaxTokensInput';

interface ConfigMenuProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ConfigMenu: React.FC<ConfigMenuProps> = ({ chatId, isOpen, onClose }) => {
  const { config, updateConfig } = useChatConfig(chatId);
  const capabilityRegistry = CapabilityRegistry.getInstance();
  
  // Get available providers
  const providers = ProviderRegistry.getProviders();
  
  // Get current provider
  const currentProvider = ProviderRegistry.getProvider(config.provider);
  
  // Handle provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    const provider = ProviderRegistry.getProvider(newProvider);
    
    // Update provider and set default model for that provider
    updateConfig({
      provider: newProvider,
      modelConfig: {
        ...config.modelConfig,
        model: provider.models[0]
      }
    });
  };
  
  // Get capabilities supported by current provider/model
  const supportedCapabilities = capabilityRegistry.getSupportedCapabilities(
    config.provider,
    config.modelConfig.model
  );
  
  return (
    <PopupModal
      title="Chat Configuration"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Provider
          </label>
          <select
            value={config.provider}
            onChange={handleProviderChange}
            className="w-full p-2 border rounded"
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Model Selection */}
        <ModelSelector chatId={chatId} />
        
        {/* Basic Parameters */}
        <div className="space-y-3">
          <TemperatureSlider chatId={chatId} />
          <MaxTokensInput chatId={chatId} />
        </div>
        
        {/* Capabilities */}
        {supportedCapabilities.length > 0 && (
          <div>
            <h3 className="text-md font-medium mb-2">Capabilities</h3>
            <div className="space-y-3">
              {supportedCapabilities.map(capability => {
                const CapabilityComponent = capability.configComponent;
                return (
                  <div key={capability.id}>
                    <CapabilityComponent chatId={chatId} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PopupModal>
  );
};

export default ConfigMenu;