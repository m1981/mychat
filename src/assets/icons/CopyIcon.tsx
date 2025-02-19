import React from 'react';

const CopyIcon = () => {
  return (
    <div className="p-1.5 rounded-md
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
        <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'></path>
        <rect x='8' y='2' width='8' height='4' rx='1' ry='1'></rect>
      </svg>
    </div>
      );
      };

      export default CopyIcon;
