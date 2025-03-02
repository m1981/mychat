// src/hooks/usePasteHandler.ts
import { useCallback } from 'react';

interface UsePasteHandlerProps {
  onContentUpdate: (content: string) => void;
  currentContent: string;
}

export const usePasteHandler = ({ onContentUpdate, currentContent }: UsePasteHandlerProps) => {
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault(); // Prevent default paste
    
    const textarea = e.currentTarget;
    const pastedContent = e.clipboardData.getData('text');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Construct the new content using the textarea's built-in methods
    const beforeContent = textarea.value.substring(0, start);
    const afterContent = textarea.value.substring(end);
    const newContent = beforeContent + pastedContent + afterContent;
    
    // Update the textarea value
    textarea.value = newContent;
    
    // Update cursor position after paste
    const newCursorPosition = start + pastedContent.length;
    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    
    // Trigger React's state update
    onContentUpdate(newContent);
    
    // Dispatch input event for any other listeners
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }, [onContentUpdate]);

  return { handlePaste };
};