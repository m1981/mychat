import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import CrossIcon from '@icon/CrossIcon';
import { debug } from '@utils/debug';

const SearchBar = ({
  value,
  handleChange,
  className,
  disabled,
}: {
  value: string;
  handleChange: React.ChangeEventHandler<HTMLInputElement>;
  className?: React.HTMLAttributes<HTMLDivElement>['className'];
  disabled?: boolean;
}) => {
  const { t } = useTranslation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debug.log('ui', '[SearchBar] Input value changed:', e.target.value);
    handleChange(e);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      debug.log('ui', '[SearchBar] ESC pressed, clearing search');
      const syntheticEvent = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      handleChange(syntheticEvent);
    }
  }, [handleChange]);

  const handleClearClick = useCallback(() => {
    debug.log('ui', '[SearchBar] Clear button clicked');
    const syntheticEvent = {
      target: { value: '' }
    } as React.ChangeEvent<HTMLInputElement>;
    handleChange(syntheticEvent);
  }, [handleChange]);

  return (
    <div className={`relative ${className}`}>
      <input
        disabled={disabled}
        type='text'
        className='text-gray-800 dark:text-white p-3 text-sm bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity m-0 w-full h-full focus:outline-none rounded border border-gray-300 dark:border-white/20'
        placeholder={t('search') as string}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      {value && !disabled && (
        <button
          className='absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-gray-800 dark:bg-white rounded-full'
          onClick={handleClearClick}
          aria-label="Clear search"
        >
          <CrossIcon className='w-4 h-4 text-white dark:text-gray-800' />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
