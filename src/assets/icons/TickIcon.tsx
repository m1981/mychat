import React from 'react';

const TickIcon = () => {
  return (
    <div className="p-0.5 rounded-md
      border border-transparent
      hover:border-gray-300 dark:hover:border-gray-600
      hover:bg-gray-100 dark:hover:bg-gray-800
      transition-all duration-200 cursor-pointer">
      <svg
        stroke='currentColor'
        fill='none'
        strokeWidth='2'
        viewBox='0 0 24 24'
        strokeLinecap='round'
        strokeLinejoin='round'
        className="h-4 w-4 text-gray-600 dark:text-gray-300"
        height='1em'
        width='1em'
        xmlns='http://www.w3.org/2000/svg'
      >
        <polyline points='20 6 9 17 4 12'></polyline>
      </svg>
    </div>
  );
};

export default TickIcon;
