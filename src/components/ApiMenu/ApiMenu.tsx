import { useState } from 'react';

import PopupModal from '@components/PopupModal';
import AnthropicIcon from '@icon/AnthropicIcon';
import OpenAIIcon from '@icon/OpenAIIcon';
import { ProviderRegistry } from '@config/providers/provider.registry';
import useStore from '@store/store';
import { ProviderKey } from '@type/chat';
import { useTranslation } from 'react-i18next';

const formFieldStyles = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500';
const labelStyles = 'block text-sm font-medium text-gray-900 dark:text-gray-300';

// Add provider icons object
const providerIcons = {
  openai: <OpenAIIcon className="w-5 h-5" />,
  anthropic: <AnthropicIcon className="w-5 h-5" />,
};

const ApiMenu = ({
  setIsModalOpen,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t } = useTranslation('api');
  const apiKeys = useStore((state) => state.apiKeys);
  const setApiKey = useStore((state) => state.setApiKey);
  const [openAIKey, setOpenAIKey] = useState<string>(apiKeys.openai || '');
  const [anthropicKey, setAnthropicKey] = useState<string>(apiKeys.anthropic || '');

  // Get available providers from registry
  const availableProviders = ProviderRegistry.getAvailableProviders();

  const handleSave = () => {
    // Update API keys in store
    if (openAIKey !== apiKeys.openai) {
      setApiKey('openai', openAIKey);
    }
    if (anthropicKey !== apiKeys.anthropic) {
      setApiKey('anthropic', anthropicKey);
    }
    setIsModalOpen(false);
  };

  return (
    <PopupModal
      title={t('apiKeys')}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        {availableProviders.map((providerKey: ProviderKey) => {
          const provider = ProviderRegistry.getProvider(providerKey);
          const icon = providerIcons[providerKey];
          const apiKey = providerKey === 'openai' ? openAIKey : 
                         providerKey === 'anthropic' ? anthropicKey : '';
          const setApiKeyState = providerKey === 'openai' ? setOpenAIKey : 
                                providerKey === 'anthropic' ? setAnthropicKey : () => {};
          
          return (
            <div key={providerKey} className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                {icon && <span>{icon}</span>}
                <label htmlFor={`${providerKey}-api-key`} className={labelStyles}>
                  {provider.name} API Key
                </label>
              </div>
              <input
                id={`${providerKey}-api-key`}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
                className={formFieldStyles}
                placeholder={`Enter your ${provider.name} API key`}
              />
            </div>
          );
        })}
      </div>
    </PopupModal>
  );
};

export default ApiMenu;