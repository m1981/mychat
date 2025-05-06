import { useEffect, RefObject, useRef } from 'react';
import { debug } from '@utils/debug';

interface UseTextareaFocusOptions {
  scrollIntoView?: boolean;
  cursorAtEnd?: boolean;
  debugId?: string;
  refocusOnScroll?: boolean;
}

export function useTextareaFocus({
  textareaRef,
  options = {
    scrollIntoView: true,
    cursorAtEnd: false,
    debugId: 'textarea',
    refocusOnScroll: false
  }
}: {
  textareaRef: RefObject<HTMLTextAreaElement>;
  options?: UseTextareaFocusOptions;
}) {
  const { cursorAtEnd, debugId } = options;
  const userInteracting = useRef(false);
  const isMounted = useRef(false);
  
  // Focus logic
  const focusTextarea = () => {
    if (!textareaRef.current || !isMounted.current || userInteracting.current) {
      return;
    }
    
    textareaRef.current.focus();
    
    // Set cursor position
    if (cursorAtEnd) {
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      debug.log('focus', `[${debugId}] Cursor at end: position ${length}`);
    } else {
      // Position cursor at the end of the first line
      const firstLineEnd = textareaRef.current.value.indexOf('\n');
      const position = firstLineEnd > -1 ? firstLineEnd : textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(position, position);
      debug.log('focus', `[${debugId}] Cursor at first line end: position ${position}`);
    }
  };
  
  // Initial focus effect
  useEffect(() => {
    isMounted.current = true;
    
    // Try to focus with a small delay to ensure the ref is available
    const timer = setTimeout(() => {
      if (isMounted.current && textareaRef.current) {
        focusTextarea();
      }
    }, 50);
    
    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  }, [textareaRef]);
  
  // Handle user interaction and blur events
  useEffect(() => {
    if (!isMounted.current) return;
    
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
          if (isMounted.current && !userInteracting.current) {
            focusTextarea();
          }
        }, 100);
      }
    };
    
    // Add event listeners
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown);
    
    if (textareaRef.current) {
      textareaRef.current.addEventListener('blur', handleBlur);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      
      if (textareaRef.current) {
        textareaRef.current.removeEventListener('blur', handleBlur);
      }
    };
  }, [textareaRef, debugId, cursorAtEnd]);
}