import React, { useState, useCallback, useRef } from 'react';
import { useTextSelection } from '@hooks/useTextSelection';
import { toast } from 'react-hot-toast';

interface SelectionCopyProviderProps {
  children: React.ReactNode;
}

export const SelectionCopyProvider: React.FC<SelectionCopyProviderProps> = ({
                                                                              children
                                                                            }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const toastIdRef = useRef<string | null>(null);

  const handleCopy = useCallback(async (text: string) => {
    try {
      // Dismiss previous toast if exists
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }

      await navigator.clipboard.writeText(text);
      setCopiedText(text);

      // Store the new toast ID
      toastIdRef.current = toast.success('Text copied to clipboard!', {
        duration: 2000,
        position: 'bottom-right',
        id: `copy-toast-${Date.now()}`, // Unique ID for each toast
      });

      setTimeout(() => {
        setCopiedText(null);
        toastIdRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy text', {
        id: `error-toast-${Date.now()}`,
      });
    }
  }, []);

  useTextSelection(handleCopy);

  return (
    <div className="selection-copy-container">
      {children}
    </div>
  );
};