import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import PopupModal from '@components/PopupModal';
import { providers } from '@type/providers';
import { ProviderKey } from '@type/chat';
import AnthropicIcon from '@icon/AnthropicIcon';
import OpenAIIcon from '@icon/OpenAIIcon';

const formFieldStyles = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500';
const labelStyles = 'block text-sm font-medium text-gray-900 dark:text-gray-300';

// Add provider icons object
const providerIcons = {
  openai: <OpenAIIcon className="w-5 h-5" />,
  anthropic: <AnthropicIcon className="w-5 h-5" />,
};

const ApiMenu = ({
  setIsModalOpen
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  const { t } = useTranslation(['main', 'api']);
  const currentProvider = useStore((state) => state.defaultChatConfig.provider);
  const setProvider = useStore((state) => state.setProvider);

  const apiKeys = useStore((state) => state.apiKeys);
  const setApiKey = useStore((state) => state.setApiKey);
  const apiEndpoints = useStore((state) => state.apiEndpoints);
  const setApiEndpoint = useStore((state) => state.setApiEndpoint);

  const [tempApiKeys, setTempApiKeys] = useState<Record<ProviderKey, string>>(apiKeys);
  const [tempEndpoints, setTempEndpoints] = useState<Record<ProviderKey, string>>(apiEndpoints);

  const handleSave = () => {
    Object.entries(tempApiKeys).forEach(([provider, key]) => {
      setApiKey(provider as ProviderKey, key);
    });

    Object.entries(tempEndpoints).forEach(([provider, endpoint]) => {
      setApiEndpoint(provider as ProviderKey, endpoint);
    });
    
    setIsModalOpen(false);
  };

  return (
    <PopupModal
      title={t('api') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        {Object.values(providers).map((p) => (
          <div key={p.id} className='mb-6'>
            <div className='mb-4'>
              <label className={`${labelStyles} flex items-center gap-2`}>
                {providerIcons[p.id as keyof typeof providerIcons]}
                <span>{p.name} API Key</span>
              </label>
              <input
                type='password'
                value={tempApiKeys[p.id] || ''}
                onChange={(e) => setTempApiKeys({
                  ...tempApiKeys,
                  [p.id]: e.target.value
                })}
                className={formFieldStyles}
              />
            </div>
          </div>
        ))}

        <div className='text-sm text-gray-900 dark:text-gray-300 flex flex-col gap-3'>
          <p>{t('securityMessage', { ns: 'api' })}</p>
        </div>
      </div>
    </PopupModal>
  );
};

export default ApiMenu;