import React, { useState, useCallback, useRef, useEffect } from 'react';

import { useTextSelection } from '@hooks/useTextSelection';
import { toast } from 'react-hot-toast';


interface SelectionCopyProviderProps {
  children: React.ReactNode;
}

export const SelectionCopyProvider: React.FC<SelectionCopyProviderProps> = ({
  children
}) => {
  // Use _ to indicate intentionally unused variable
  const [_, setCopiedText] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = useCallback(async (text: string) => {
    try {
      const selection = window.getSelection();
      const isWithinContainer = selection && containerRef.current?.contains(selection.anchorNode);
      
      if (!isWithinContainer) return;

      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success('Text copied to clipboard!', {
        duration: 2000,
        position: 'bottom-right'
      });

      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy text');
    }
  }, []);

  useTextSelection({
    textareaRef
  });

  useEffect(() => {
    const handleSelection = async () => {
      if (window.getSelection) {
        const selection = window.getSelection();
        if (selection && selection.toString()) {
          await handleCopy(selection.toString());
        }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [handleCopy]);

  return (
    <div ref={containerRef} className="selection-copy-container">
      {children}
    </div>
  );
};