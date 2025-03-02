import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { useTextSelection } from '@hooks/useTextSelection';

interface SelectionCopyProviderProps {
  children: React.ReactNode;
}

export const SelectionCopyProvider: React.FC<SelectionCopyProviderProps> = ({
  children
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useTextSelection(handleCopy);

  return (
    <div ref={containerRef} className="selection-copy-container">
      {children}
    </div>
  );
};