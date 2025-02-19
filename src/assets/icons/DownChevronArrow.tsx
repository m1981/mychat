import React from 'react';

const DownChevronArrow = ({ className }: { className?: string }) => {
  return (
    <div className="p-1.5 rounded-md
      border border-transparent
      hover:border-gray-300 dark:hover:border-gray-600
      hover:bg-gray-100 dark:hover:bg-gray-800
      group
      transition-all duration-200 cursor-pointer">
      <svg
        className={`w-4 h-4 text-gray-600 dark:text-gray-300 
          group-hover:text-gray-900 dark:group-hover:text-white 
          ${className || ''}`}
        aria-hidden='true'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          d='M19 9l-7 7-7-7'
        ></path>
      </svg>
    </div>
  );
};

export default DownChevronArrow;
