import React from 'react';

const EditIcon2 = () => {
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
      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
      <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path>
    </svg>
    </div>
  );
};

export default EditIcon2;
