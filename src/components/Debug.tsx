import useStore from '@store/store';
import { useEffect, useRef } from 'react';

// Change from export const to default export
const Debug = () => {
  const store = useStore();
  const renderCount = useRef(0);

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
    console.log(`🔄 Debug component rendered ${renderCount.current} times`);
  });

  // Enhanced debugging output
  console.log('🔍 Store state:', {
    generating: store.generating,
    currentChatIndex: store.currentChatIndex,
    messageCount: store.chats?.[store.currentChatIndex]?.messages.length,
    totalChats: store.chats?.length || 0,
    currentChat: store.chats?.[store.currentChatIndex] ? {
      messages: store.chats[store.currentChatIndex].messages.map(msg => ({
        role: msg.role,
        contentLength: msg.content.length,
        preview: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '')
      }))
    } : 'No active chat',
    lastMessage: store.chats?.[store.currentChatIndex]?.messages.slice(-1)[0] ? {
      role: store.chats[store.currentChatIndex].messages.slice(-1)[0].role,
      contentLength: store.chats[store.currentChatIndex].messages.slice(-1)[0].content.length,
      preview: store.chats[store.currentChatIndex].messages.slice(-1)[0].content.slice(0, 50) + 
               (store.chats[store.currentChatIndex].messages.slice(-1)[0].content.length > 50 ? '...' : '')
    } : 'No messages'
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
