import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import PersonIcon from '@icon/PersonIcon';
import ApiMenu from '@components/ApiMenu';

const Config = () => {
  const { t } = useTranslation();
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
        id='api-menu'
        onClick={() => setIsModalOpen(true)}
      >
        <PersonIcon />
        {t('api')}
      </a>
      {isModalOpen && <ApiMenu setIsModalOpen={setIsModalOpen} />}
    </>
  );
};

export default Config;
