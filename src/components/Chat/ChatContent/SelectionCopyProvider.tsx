import React, { useState, useCallback } from 'react';
import { useTextSelection } from '@hooks/useTextSelection';
import { toast } from 'react-hot-toast';

interface SelectionCopyProviderProps {
  children: React.ReactNode;
}

export const SelectionCopyProvider: React.FC<SelectionCopyProviderProps> = ({
                                                                              children
                                                                            }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string) => {
    try {
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
    <div className="selection-copy-container">
      {children}
    </div>
  );
};