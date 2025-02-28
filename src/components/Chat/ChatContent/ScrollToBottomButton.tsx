import React from 'react';

import DownArrow from '@icon/DownArrow';

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = React.memo(
  ({ show, onClick }) => {
    return (
      <button
        className={`cursor-pointer fixed right-6 bottom-[60px] md:bottom-[60px] z-10 rounded-full border border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 transition-opacity duration-200 ${
          show ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClick}
        aria-label="Scroll to bottom"
      >
        <DownArrow />
      </button>
    );
  }
);

ScrollToBottomButton.displayName = 'ScrollToBottomButton';

export default ScrollToBottomButton;