import React, { useEffect, useRef, useState } from 'react';

import CrossIcon2 from '@icon/CrossIcon2';
import DownArrow from '@icon/DownArrow';
import MenuIcon from '@icon/MenuIcon';
import useStore from '@store/store';


import ChatHistoryList from './ChatHistoryList';
import MenuOptions from './MenuOptions';
import NewChat from './NewChat';
import NewFolder from './NewFolder';
import ChatSearch from './ChatSearch';

const Menu: React.FC = () => {
  const [searchFilter, setSearchFilter] = useState('');
  const hideSideMenu = useStore((state) => state.hideSideMenu);
  const setHideSideMenu = useStore((state) => state.setHideSideMenu);

  const handleSearchFilterChange = (newFilter: string) => {
    console.log('[Menu] Setting new search filter:', newFilter);
    setSearchFilter(newFilter);
  };

  return (
    <>
      <div
        id='menu'
        className={`group/menu bg-white dark:bg-gray-900 fixed md:inset-y-0 md:flex md:w-[290px] md:flex-col transition-transform z-[999] top-0 left-0 h-full max-md:w-3/4 ${
          hideSideMenu ? 'translate-x-[-100%]' : 'translate-x-[0%]'
        }`}
      >
        <div className='flex h-full min-h-0 flex-col'>
          <div className='flex h-full w-full flex-1 items-start'>
            <nav className='flex h-full w-full flex-1 flex-col space-y-2 px-3 pt-2'>
              <div className='flex gap-2'>
                <NewChat />
                <NewFolder />
              </div>
              <ChatSearch 
                filter={searchFilter}
                setFilter={handleSearchFilterChange}
              />
              <ChatHistoryList 
                searchFilter={searchFilter}
                onSearchChange={handleSearchFilterChange}
              />
              <MenuOptions />
            </nav>
          </div>
        </div>
        <div
          id='menu-close'
          className={`${
            hideSideMenu ? 'hidden' : ''
          } md:hidden absolute z-[999] right-0 translate-x-full top-10 bg-gray-900 p-2 cursor-pointer hover:bg-black text-white`}
          onClick={() => {
            setHideSideMenu(true);
          }}
        >
          <CrossIcon2 />
        </div>
        <div
          className={`${
            hideSideMenu ? 'opacity-100' : 'opacity-0'
          } group/menu md:group-hover/menu:opacity-100 max-md:hidden transition-opacity absolute z-[999] right-0 translate-x-full top-10 bg-gray-100 dark:bg-gray-900 p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-black text-gray-900 dark:text-white ${
            hideSideMenu ? '' : 'rotate-90'
          }`}
          onClick={() => {
            setHideSideMenu(!hideSideMenu);
          }}
        >
          {hideSideMenu ? (
            <MenuIcon className='h-4 w-4' />
          ) : (
            <DownArrow className='h-4 w-4' />
          )}
        </div>
      </div>
      <div
        id='menu-backdrop'
        className={`${
          hideSideMenu ? 'hidden' : ''
        } md:hidden fixed top-0 left-0 h-full w-full z-[60] bg-black/20 dark:bg-gray-900/70`}
        onClick={() => {
          setHideSideMenu(true);
        }}
      />
    </>
  );
};

export default Menu;
