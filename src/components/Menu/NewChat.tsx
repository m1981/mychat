import React from 'react';
import { useTranslation } from 'react-i18next';

import useAddChat from '@hooks/useAddChat';
import PlusIcon from '@icon/PlusIcon';
import useStore from '@store/store';

const NewChat = ({ folder }: { folder?: string }) => {
  const { t } = useTranslation();
  const addChat = useAddChat();
  const generating = useStore((state) => state.generating);

  return (
    <a
      className={`
        flex items-center rounded-md 
        transition-colors duration-200 
        text-sm text-gray-800 dark:text-gray-100
        ${generating ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-500/10 cursor-pointer'}
        ${folder 
          ? 'justify-start select-none' 
          : 'p-2 gap-3 mb-2 border border-gray-200 dark:border-gray-600 select-none'
        }
      `}
      onClick={() => {
        if (!generating) addChat(folder);
      }}
      role="button"
      aria-label={String(t('newChat'))}
      title={folder ? String(t('newChat')) : ''}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!generating) addChat(folder);
        }
      }}
    >
      {folder ? (
        <div className="max-h-0 parent-sibling-hover:max-h-10 hover:max-h-10
                       parent-sibling-hover:py-2 hover:py-2 px-2
                       overflow-hidden transition-all duration-200 delay-500
                       flex gap-3 items-center select-none">
          <PlusIcon /> {t('newChat')}
        </div>
      ) : (
        <>
          <PlusIcon />
          <span className="inline-flex select-none">{t('newChat')}</span>
        </>
      )}
    </a>
  );
};

export default NewChat;
