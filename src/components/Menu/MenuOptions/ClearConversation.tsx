import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import PopupModal from '@components/PopupModal';
import DeleteIcon from '@icon/DeleteIcon';
import useInitialiseNewChat from '@hooks/useInitialiseNewChat';

const ClearConversation = () => {
  const { t } = useTranslation();

  const initialiseNewChat = useInitialiseNewChat();
  const setFolders = useStore((state) => state.setFolders);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleConfirm = () => {
    setIsModalOpen(false);
    initialiseNewChat();
    setFolders({});
  };

  return (
    <>
      <a
        className='flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-800 transition-colors duration-200 hover:bg-gray-500/10 dark:text-gray-100 cursor-pointer'
        onClick={() => setIsModalOpen(true)}
      >
        <DeleteIcon />
        {t('clearConversation')}
      </a>
      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('warning') as string}
          message={t('clearConversationWarning') as string}
          handleConfirm={handleConfirm}
        />
      )}
    </>
  );
};

export default ClearConversation;
