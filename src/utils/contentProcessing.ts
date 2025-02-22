// src/utils/contentProcessing.ts
import { detectCodeContent } from '@utils/languageDetection';

export const processContent = (
  content: string,
  cursorPosition: number,
  currentContent: string
) => {
  const detection = detectCodeContent(content);

  if (detection?.isCode) {
    let codeBlock: string;

    switch (detection.type) {
      case 'mermaid':
        codeBlock = `\`\`\`mermaid\n${content}\n\`\`\``;
        break;

      case 'patch':
        codeBlock = `\`\`\`diff\n${content}\n\`\`\``;
        break;

      case 'mixed':
        codeBlock = `\`\`\`${detection.subLanguages?.[0] || 'svelte'}\n${content}\n\`\`\``;
        break;

      default:
        codeBlock = `\`\`\`${detection.language}\n${content}\n\`\`\``;
    }

    return currentContent.slice(0, cursorPosition) +
      codeBlock +
      currentContent.slice(cursorPosition);
  }

  // If not code, just insert the content normally
  return currentContent.slice(0, cursorPosition) +
    content +
    currentContent.slice(cursorPosition);
};
