import useStore from '@store/store';
import { useEffect, useRef } from 'react';

// Change from export const to default export
const Debug = () => {
  const store = useStore();
  const renderCount = useRef(0);

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
  });



  // Optional: Visual debugging overlay
  if (process.env.NODE_ENV === 'development') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          fontSize: '12px',
          fontFamily: 'monospace',
          maxWidth: '300px',
          maxHeight: '200px',
          overflow: 'auto',
          zIndex: 9999,
        }}
      >
        <div>Renders: {renderCount.current}</div>
        <div>Generating: {String(store.generating)}</div>
        <div>Chat Index: {store.currentChatIndex}</div>
        <div>Messages: {store.chats?.[store.currentChatIndex]?.messages.length || 0}</div>
        <div>Total Chats: {store.chats?.length || 0}</div>
      </div>
    );
  }

  return null;
};

// Add default export
export default Debug;
