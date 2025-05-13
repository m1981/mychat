// src/components/Menu/MenuOptions/WidthSelector.tsx
import React from 'react';


import { LayoutWidth } from '@store/config-slice';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';

const WidthSelector = () => {
  const { t } = useTranslation();
  const layoutWidth = useStore((state) => state.layoutWidth);
  const setLayoutWidth = useStore((state) => state.setLayoutWidth);

  const handleWidthChange = (width: LayoutWidth) => {
    setLayoutWidth(width);
  };

  return (
    <div className='flex flex-col gap-2'>
      <label className='text-sm font-medium text-gray-900 dark:text-gray-300'>
        {t('layoutWidth')}
      </label>
      <div className='flex gap-2'>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            layoutWidth === 'normal'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300'
          }`}
          onClick={() => handleWidthChange('normal')}
        >
          {t('normal')}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            layoutWidth === 'wide'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300'
          }`}
          onClick={() => handleWidthChange('wide')}
        >
          {t('wide')}
        </button>
      </div>
    </div>
  );
};

export default WidthSelector;
