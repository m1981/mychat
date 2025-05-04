import { useEffect, RefObject, useRef } from 'react';
import { debug } from '@utils/debug';

interface UseTextareaFocusOptions {
  scrollIntoView?: boolean;
  cursorAtEnd?: boolean;
  debugId?: string; // Optional ID for debugging
  refocusOnScroll?: boolean; // Whether to attempt refocus after scroll events
}

export function useTextareaFocus(
  textareaRef: RefObject<HTMLTextAreaElement>,
  options: UseTextareaFocusOptions = { 
    scrollIntoView: true, 
    cursorAtEnd: true,
    debugId: 'textarea',
    refocusOnScroll: false // Default to false to allow normal scrolling
  }
) {
  const { scrollIntoView, cursorAtEnd, debugId, refocusOnScroll } = options;
  const focusAttempts = useRef(0);
  const userInteracting = useRef(false);
  
  // Initial focus
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const focusTextarea = () => {
      if (!textareaRef.current || userInteracting.current) return;
      
      // Focus the textarea
      textareaRef.current.focus();
      focusAttempts.current++;
      
      debug.log('focus', `[${debugId}] Focus attempt ${focusAttempts.current}`);
      
      // Set cursor position to the end of the text if requested
      if (cursorAtEnd) {
        const length = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(length, length);
        debug.log('focus', `[${debugId}] Cursor set to position ${length}`);
      }
    };
    
    // Initial focus
    focusTextarea();
    
    // On mobile, ensure the element is in view when the keyboard appears
    if (scrollIntoView) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        debug.log('focus', `[${debugId}] Mobile detected, scrolling into view`);
        
        // Add a slight delay to account for keyboard appearance
        setTimeout(() => {
          if (!textareaRef.current) return;
          
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
          });
        }, 300);
      }
    }
    
    // Track user interaction with the page
    const handleMouseDown = () => {
      userInteracting.current = true;
      debug.log('focus', `[${debugId}] User interaction detected`);
      
      // Reset after a short delay to allow focus to be regained
      setTimeout(() => {
        userInteracting.current = false;
        debug.log('focus', `[${debugId}] User interaction flag reset`);
      }, 1000);
    };
    
    // Only refocus on blur if the textarea itself is blurred
    const handleBlur = (e: FocusEvent) => {
      debug.log('focus', `[${debugId}] Textarea blur detected`);
      
      // If user is interacting, don't interfere
      if (userInteracting.current) {
        debug.log('focus', `[${debugId}] User is interacting, not refocusing`);
        return;
      }
      
      // Only refocus if the blur was not caused by clicking another interactive element
      if (e.relatedTarget === null) {
        // Short delay to allow other focus events to settle
        setTimeout(() => {
          // Check if user is still not interacting
          if (!userInteracting.current) {
            debug.log('focus', `[${debugId}] Refocusing after blur with no target`);
            focusTextarea();
          }
        }, 100);
      } else {
        debug.log('focus', `[${debugId}] Blur to ${e.relatedTarget?.tagName}, not refocusing`);
      }
    };
    
    // Add event listeners
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown);
    textareaRef.current.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      textareaRef.current?.removeEventListener('blur', handleBlur);
      debug.log('focus', `[${debugId}] Cleanup: removed event listeners`);
    };
  }, []); // Run only once when component mounts
}