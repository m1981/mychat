import React, { useState, useEffect } from 'react';

import DownArrow from '@icon/DownArrow';

const ScrollToBottomButton = React.memo(() => {
  const [atBottom, setAtBottom] = useState(false);

  const handleScroll = () => {
    const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight;
    setAtBottom(isAtBottom);
  };

  // Set up an effect to add and remove the scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // Call handleScroll initially in case the page is already scrolled to bottom
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToBottom = () => {
    window.scrollTo(0, document.body.scrollHeight);
  };

  return (
    <button
      className={`cursor-pointer absolute right-6 bottom-[60px] md:bottom-[60px] z-10 rounded-full border border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 ${
        atBottom ? 'hidden' : ''
      }`}
      onClick={scrollToBottom}
    >
      <DownArrow />
    </button>
  );
});

export default ScrollToBottomButton;
