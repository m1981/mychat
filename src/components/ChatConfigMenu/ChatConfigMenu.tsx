import React, { useState } from 'react';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import { providers } from '@type/providers';

import PopupModal from '@components/PopupModal';
import {
  FrequencyPenaltySlider,
  MaxTokenSlider,
  ModelSelector,
  PresencePenaltySlider,
  TemperatureSlider,
  TopPSlider,
} from '@components/ConfigMenu/ConfigMenu';

import { ModelOptions, ChatConfig, ModelConfig, ProviderKey } from '@type/chat';
import { _defaultChatConfig, _defaultModelConfig, _defaultSystemMessage } from '@constants/chat';

const ChatConfigMenu = () => {
  const { t } = useTranslation('model');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  return (
    <div>
      <button className='btn btn-neutral' onClick={() => setIsModalOpen(true)}>
        {t('defaultChatConfig')}
      </button>
      {isModalOpen && <ChatConfigPopup setIsModalOpen={setIsModalOpen} />}
    </div>
  );
};

const ChatConfigPopup = ({
  setIsModalOpen,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const config = useStore.getState().defaultChatConfig;
  const setDefaultChatConfig = useStore((state) => state.setDefaultChatConfig);
  const setDefaultSystemMessage = useStore((state) => state.setDefaultSystemMessage);

  const [_systemMessage, _setSystemMessage] = useState<string>(
    useStore.getState().defaultSystemMessage
  );
  const [_provider, _setProvider] = useState<ProviderKey>(config.provider);
  const [_modelConfig, _setModelConfig] = useState<ModelConfig>(config.modelConfig);

  const { t } = useTranslation('model');

  const handleSave = () => {
    setDefaultChatConfig({
      provider: _provider,
      modelConfig: _modelConfig,
    });
    setDefaultSystemMessage(_systemMessage);
    setIsModalOpen(false);
  };

  const handleReset = () => {
    _setProvider(_defaultChatConfig.provider);
    _setModelConfig(_defaultModelConfig);
    _setSystemMessage(_defaultSystemMessage);
  };

  return (
    <PopupModal
      title={t('defaultChatConfig') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600 w-[90vw] max-w-full text-sm text-gray-900 dark:text-gray-300'>
        <DefaultSystemChat
          _systemMessage={_systemMessage}
          _setSystemMessage={_setSystemMessage}
        />
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
        <div
          className='btn btn-neutral cursor-pointer mt-5'
          onClick={handleReset}
        >
          {t('resetToDefault')}
        </div>
      </div>
    </PopupModal>
  );
};

const DefaultSystemChat = ({
  _systemMessage,
  _setSystemMessage,
}: {
  _systemMessage: string;
  _setSystemMessage: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { t } = useTranslation('model');

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    e.target.style.maxHeight = `${e.target.scrollHeight}px`;
  };

  const handleOnFocus = (e: React.FocusEvent<HTMLTextAreaElement, Element>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    e.target.style.maxHeight = `${e.target.scrollHeight}px`;
  };

  const handleOnBlur = (e: React.FocusEvent<HTMLTextAreaElement, Element>) => {
    e.target.style.height = 'auto';
    e.target.style.maxHeight = '2.5rem';
  };

  return (
    <div>
      <div className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('defaultSystemMessage')}
      </div>
      <textarea
        className='my-2 mx-0 px-2 resize-none rounded-lg bg-transparent overflow-y-hidden leading-7 p-1 border border-gray-400/50 focus:ring-1 focus:ring-blue w-full max-h-10 transition-all'
        onFocus={handleOnFocus}
        onBlur={handleOnBlur}
        onChange={(e) => {
          _setSystemMessage(e.target.value);
        }}
        onInput={handleInput}
        value={_systemMessage}
        rows={1}
      ></textarea>
    </div>
  );
};

export default ChatConfigMenu;
