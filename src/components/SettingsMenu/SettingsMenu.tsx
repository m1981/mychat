import { useState } from 'react';

import ChatConfigMenu from '@components/ChatConfigMenu';
import LanguageSelector from '@components/LanguageSelector';
import ThemeSwitcher from '@components/Menu/MenuOptions/ThemeSwitcher';
import WidthSelector from '@components/Menu/MenuOptions/WidthSelector';
import PopupModal from '@components/PopupModal';
import PromptLibraryMenu from '@components/PromptLibraryMenu';
import SettingIcon from '@icon/SettingIcon';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';

import AutoTitleToggle from './AutoTitleToggle';
import EnterToSubmitToggle from './EnterToSubmitToggle';

const SettingsMenu = () => {
  const { t } = useTranslation();
  const theme = useStore.getState().theme;
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <a
className={`
  flex items-center gap-3
  py-2 px-2
  rounded-md
  text-gray-800 dark:text-gray-100 text-sm
  cursor-pointer
  hover:bg-gray-500/10
  transition-colors duration-200
`}
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <SettingIcon className='w-4 h-4' /> {t('setting') as string}
      </a>
      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('setting') as string}
          cancelButton={false}
        >
          <div className='p-6 border-b border-gray-200 dark:border-gray-600 flex flex-col items-center gap-4'>
            <LanguageSelector />
            <ThemeSwitcher />
            <WidthSelector />
            <div className='flex flex-col gap-3'>
              <AutoTitleToggle />
              <EnterToSubmitToggle />
            </div>
            <PromptLibraryMenu />
            <ChatConfigMenu />
          </div>
        </PopupModal>
      )}
    </>
  );
};

export default SettingsMenu;