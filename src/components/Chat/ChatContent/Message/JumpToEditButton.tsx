import React, { useRef, useEffect } from 'react';
import { debug } from '@utils/debug';

interface JumpToEditButtonProps {
  editAreaId: string;
  visible: boolean;
}

const JumpToEditButton: React.FC<JumpToEditButtonProps> = ({ editAreaId, visible }) => {
  if (!visible) return null;
  
  // Use a ref to store the last known cursor position
  const lastKnownPositionRef = useRef<{ start: number; end: number } | null>(null);
  
  // Set up an effect to track cursor position changes
  useEffect(() => {
    const editArea = document.getElementById(editAreaId);
    if (!editArea) return;
    
    const textarea = editArea.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    // Function to update the stored position
    const updatePosition = () => {
      lastKnownPositionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      };
      debug.log('focus', `[jump-button] Updated stored position: ${textarea.selectionStart}-${textarea.selectionEnd}`);
    };
    
    // Track selection changes
    textarea.addEventListener('select', updatePosition);
    textarea.addEventListener('click', updatePosition);
    textarea.addEventListener('keyup', updatePosition);
    
    // Initial position
    updatePosition();
    
    return () => {
      textarea.removeEventListener('select', updatePosition);
      textarea.removeEventListener('click', updatePosition);
      textarea.removeEventListener('keyup', updatePosition);
    };
  }, [editAreaId]);
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Don't prevent default - let the browser handle the anchor navigation
    
    // After navigation, find the textarea and focus it
    setTimeout(() => {
      const editArea = document.getElementById(editAreaId);
      if (editArea) {
        const textarea = editArea.querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          debug.log('focus', `[jump-button] Focused textarea after jump`);
          
          // Restore the previous cursor position if available
          if (lastKnownPositionRef.current) {
            const { start, end } = lastKnownPositionRef.current;
            textarea.setSelectionRange(start, end);
            debug.log('focus', `[jump-button] Restored cursor to position ${start}-${end}`);
          } else {
            // Fall back to end of text if no position stored
            const length = textarea.value.length;
            textarea.setSelectionRange(length, length);
            debug.log('focus', `[jump-button] Set cursor to end position ${length} (fallback)`);
          }
        } else {
          debug.log('focus', `[jump-button] Could not find textarea in edit area`);
        }
      } else {
        debug.log('focus', `[jump-button] Could not find edit area with id ${editAreaId}`);
      }
    }, 100); // Short delay to allow scroll to complete
  };
  
  return (
    <a 
      href={`#${editAreaId}`}
      className="fixed right-6 bottom-[120px] z-50 rounded-full border border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 p-3 shadow-lg"
      aria-label="Jump to edit area"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">↑</span>
        <span className="text-sm font-medium">Jump to Edit</span>
      </div>
    </a>
  );
};

export default JumpToEditButton;