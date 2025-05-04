import useStore from '@store/store';
import { useEffect, useRef, useState } from 'react';
import { LogModule, LOG_MODULES } from '@config/logging';
import { debug } from '@utils/debug';

// Interface to track cursor position
interface CursorPosition {
  line: number;
  column: number;
  element: string | null;
  // Add reading position tracking
  readingLine: number;
  readingElement: string | null;
}

const Debug = () => {
  const store = useStore();
  const renderCount = useRef(0);
  const [activeModules, setActiveModules] = useState<Set<LogModule>>(
    new Set(debug.getActiveModules())
  );
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    line: 0,
    column: 0,
    element: null,
    readingLine: 0,
    readingElement: null
  });

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
  });

  // Track cursor position in textareas and reading mode
  useEffect(() => {
    const trackCursorPosition = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if we're in a textarea
      if (target.tagName === 'TEXTAREA') {
        const textarea = target as HTMLTextAreaElement;
        const value = textarea.value;
        
        // Get cursor position
        const cursorIndex = textarea.selectionStart;
        
        // Calculate line and column
        const lines = value.substring(0, cursorIndex).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        // Get element identifier (could be improved to get more specific IDs)
        const elementId = textarea.id || 'unnamed-textarea';
        const parentId = textarea.closest('[id]')?.id || '';
        const elementIdentifier = parentId ? `${parentId} > textarea` : elementId;
        
        setCursorPosition(prev => ({
          ...prev,
          line,
          column,
          element: elementIdentifier
        }));
      } else {
        // Track reading position in message content
        const messageContent = target.closest('.markdown') || target.closest('.share-gpt-message');
        if (messageContent) {
          // Get the y position of the cursor relative to the message content
          const rect = messageContent.getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          
          // Estimate the line based on position and line height (assuming ~24px line height)
          const lineHeight = 24;
          const estimatedLine = Math.floor(relativeY / lineHeight) + 1;
          
          // Get element identifier
          const messageElement = target.closest('[id]');
          const elementId = messageElement?.id || 'unknown-message';
          
          setCursorPosition(prev => ({
            ...prev,
            readingLine: estimatedLine,
            readingElement: elementId || messageContent.className
          }));
        }
      }
    };

    // Also track on selection change
    const handleSelectionChange = () => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        const textarea = activeElement as HTMLTextAreaElement;
        const value = textarea.value;
        const cursorIndex = textarea.selectionStart;
        
        const lines = value.substring(0, cursorIndex).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        const elementId = textarea.id || 'unnamed-textarea';
        const parentId = textarea.closest('[id]')?.id || '';
        const elementIdentifier = parentId ? `${parentId} > textarea` : elementId;
        
        setCursorPosition(prev => ({
          ...prev,
          line,
          column,
          element: elementIdentifier
        }));
      }
    };

    document.addEventListener('mousemove', trackCursorPosition);
    document.addEventListener('click', trackCursorPosition);
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('mousemove', trackCursorPosition);
      document.removeEventListener('click', trackCursorPosition);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const toggleModule = (module: LogModule) => {
    const newModules = new Set(activeModules);
    if (newModules.has(module)) {
      newModules.delete(module);
    } else {
      newModules.add(module);
    }
    setActiveModules(newModules);
    debug.setActiveModules(Array.from(newModules));
  };

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
          maxHeight: '400px',
          overflow: 'auto',
          zIndex: 9999,
        }}
      >
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '8px', marginBottom: '8px' }}>
          <strong>Debug Modules:</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {LOG_MODULES.map((module) => (
              <label
                key={module}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={activeModules.has(module)}
                  onChange={() => toggleModule(module)}
                  style={{ marginRight: '6px' }}
                />
                {module.charAt(0).toUpperCase() + module.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div>Renders: {renderCount.current}</div>
        <div>Generating: {String(store.generating)}</div>
        <div>Chat Index: {store.currentChatIndex}</div>
        <div>Messages: {store.chats?.[store.currentChatIndex]?.messages.length || 0}</div>
        <div>Total Chats: {store.chats?.length || 0}</div>
        
        {/* Cursor position information */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', marginTop: '8px' }}>
          <strong>Cursor Position:</strong>
          <div>Line: {cursorPosition.line}</div>
          <div>Column: {cursorPosition.column}</div>
          <div>Element: {cursorPosition.element || 'None'}</div>
        </div>
        
        {/* Reading position information */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', marginTop: '8px' }}>
          <strong>Reading Position:</strong>
          <div>Line: {cursorPosition.readingLine}</div>
          <div>Element: {cursorPosition.readingElement || 'None'}</div>
        </div>
      </div>
    );
  }

  return null;
};

export default Debug;
