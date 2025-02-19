import React from 'react';

const RefreshIcon = () => {
  return (
    <div className="p-1.5 rounded-md
      border border-transparent
      hover:border-gray-300 dark:hover:border-gray-600
      hover:bg-gray-100 dark:hover:bg-gray-800
      transition-all duration-200 cursor-pointer">
      <svg
        stroke='currentColor'
        fill='none'
        strokeWidth='1.5'
        viewBox='0 0 24 24'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='h-4 w-4'
        height='1em'
        width='1em'
        xmlns='http://www.w3.org/2000/svg'
      >
        <polyline points='1 4 1 10 7 10'></polyline>
        <polyline points='23 20 23 14 17 14'></polyline>
        <path d='M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15'></path>
      </svg>
    </div>
      );
      };

      export default RefreshIcon;
