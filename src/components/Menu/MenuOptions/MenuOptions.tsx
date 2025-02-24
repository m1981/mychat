import React from 'react';
import useStore from '@store/store';

import Api from './Api';
import ImportExportChat from '@components/ImportExportChat';
import SettingsMenu from '@components/SettingsMenu';
import CollapseOptions from './CollapseOptions';

const MenuOptions = () => {
  const hideMenuOptions = useStore((state) => state.hideMenuOptions);
  return (
    <div className="border-t border-gray-200 dark:border-white/20">
      <CollapseOptions />
      <div
        className={`${
          hideMenuOptions ? 'max-h-0' : 'max-h-full'
        } overflow-hidden transition-all text-gray-900 dark:text-white`}
      >
        <ImportExportChat />
        <Api />
        <SettingsMenu />
      </div>
    </div>
  );
};

export default MenuOptions;
