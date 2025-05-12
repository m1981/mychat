import { useEffect, RefObject, useRef } from 'react';
import { debug } from '@utils/debug';

interface UseTextareaFocusOptions {
  scrollIntoView?: boolean;
  cursorAtEnd?: boolean;
  debugId?: string;
  refocusOnScroll?: boolean;
  focusLine?: number | null;
}

export function useTextareaFocus(
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined,
  options?: UseTextareaFocusOptions
) {
  // Default options
  const {
    cursorAtEnd = true,
    scrollIntoView = false,
    debugId = '',
    refocusOnScroll = true,
    focusLine = null
  } = options || {};

  // Add safety check at the beginning of the hook
  if (!textareaRef) {
    return; // Exit early if textareaRef is undefined
  }

  const userInteracting = useRef(false);
  const isMounted = useRef(false);
  
  // Focus logic
  const focusTextarea = () => {
    if (!textareaRef.current || !isMounted.current || userInteracting.current) {
      return;
    }
    
    textareaRef.current.focus();
    
    // Set cursor position only if cursorAtEnd is true or focusLine is provided
    if (cursorAtEnd) {
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      debug.log('focus', `[${debugId}] Cursor at end: position ${length}`);
    } else if (focusLine !== null && typeof focusLine === 'number') {
      // Handle focusLine option if provided
      const lines = textareaRef.current.value.split('\n');
      let position = 0;
      
      // Calculate position at the start of the specified line
      for (let i = 0; i < focusLine && i < lines.length; i++) {
        position += lines[i].length + 1; // +1 for the newline character
      }
      
      textareaRef.current.setSelectionRange(position, position);
      debug.log('focus', `[${debugId}] Cursor at line ${focusLine}: position ${position}`);
    }
    // Remove the else block that was setting cursor position at the end of first line
    
    // Handle scrollIntoView for mobile devices
    if (scrollIntoView && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 300);
    }
  };
  
  // Initial focus effect
  useEffect(() => {
    isMounted.current = true;
    
    // Focus immediately for tests
    if (textareaRef.current) {
      focusTextarea();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Handle user interaction and blur events
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const handleMouseDown = () => {
      userInteracting.current = true;
      
      // Reset after a delay
      setTimeout(() => {
        if (isMounted.current) {
          userInteracting.current = false;
        }
      }, 500);
    };
    
    const handleBlur = (e: FocusEvent) => {
      if (!isMounted.current || userInteracting.current) return;
      
      // Only refocus if blur was not to another element
      if (e.relatedTarget === null) {
        setTimeout(() => {
          if (isMounted.current && !userInteracting.current && textareaRef.current) {
            focusTextarea();
          }
        }, 100);
      }
    };
    
    // Add event listeners
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown);
    
    textareaRef.current.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      
      if (textareaRef.current) {
        textareaRef.current.removeEventListener('blur', handleBlur);
      }
    };
  }, [textareaRef, cursorAtEnd, debugId, scrollIntoView, focusLine]);
}