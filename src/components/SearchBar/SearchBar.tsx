import React from 'react';
import { useTranslation } from 'react-i18next';

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
    console.log('[SearchBar] Input value changed:', e.target.value);
    console.log('[SearchBar] Current disabled state:', disabled);
    console.log('[SearchBar] handleChange prop type:', typeof handleChange);
    
    handleChange(e);
    
    // Log after handler execution
    console.log('[SearchBar] Handler executed');
  };

  console.log('[SearchBar] Rendering with value:', value);

  return (
    <div className={className}>
      <input
        disabled={disabled}
        type='text'
        className='text-gray-800 dark:text-white p-3 text-sm bg-transparent disabled:opacity-40  disabled:cursor-not-allowed transition-opacity m-0 w-full h-full focus:outline-none rounded border border-white/20'
        placeholder={t('search') as string}
        value={value}
        onChange={handleInputChange}
      />
    </div>
  );
};

export default SearchBar;
