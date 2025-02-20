// src/hooks/usePasteHandler.ts
import { useCallback } from 'react';
import { detectCodeContent } from '@utils/languageDetection';

interface UsePasteHandlerProps {
  onContentUpdate: (content: string) => void;
  currentContent: string;
}

export const usePasteHandler = ({ onContentUpdate, currentContent }: UsePasteHandlerProps) => {
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedContent = e.clipboardData.getData('text');
    const detection = detectCodeContent(pastedContent);

    if (detection?.isCode) {
      e.preventDefault();

      let codeBlock: string;

      switch (detection.type) {
        case 'mermaid':
          codeBlock = `\`\`\`mermaid\n${pastedContent}\n\`\`\``;
          break;

        case 'patch':
          codeBlock = `\`\`\`diff\n${pastedContent}\n\`\`\``;
          break;

        case 'mixed':
          // For mixed content like Vue/Svelte components
          codeBlock = `\`\`\`${detection.subLanguages?.[0] || 'svelte'}\n${pastedContent}\n\`\`\``;
          break;

        default:
          codeBlock = `\`\`\`${detection.language}\n${pastedContent}\n\`\`\``;
      }

      // Preserve cursor position and existing content
      const cursorPosition = e.currentTarget.selectionStart;
      const newContent =
        currentContent.slice(0, cursorPosition) +
        codeBlock +
        currentContent.slice(e.currentTarget.selectionEnd);

      onContentUpdate(newContent);
    }
  }, [currentContent, onContentUpdate]);

  return { handlePaste };
};
