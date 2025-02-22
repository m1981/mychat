// src/utils/contentProcessing.ts
import { detectCodeContent } from '@utils/languageDetection';

export const processContent = (
  content: string,
  cursorPosition: number,
  currentContent: string,
  filePath?: string // New parameter
): string => {
  try {
    const detection = detectCodeContent(content);

    let processedContent = content;

    // Add file path if provided
    const filePathSection = filePath ? `${filePath}\n` : '';

    if (detection?.isCode) {
      switch (detection.type) {
        case 'mermaid':
          processedContent = `${filePathSection}\`\`\`mermaid\n${content}\n\`\`\``;
          break;

        case 'patch':
          processedContent = `${filePathSection}\`\`\`diff\n${content}\n\`\`\``;
          break;

        case 'mixed':
          processedContent = `${filePathSection}\`\`\`${detection.subLanguages?.[0] || 'svelte'}\n${content}\n\`\`\``;
          break;

        default:
          processedContent = `${filePathSection}\`\`\`${detection.language}\n${content}\n\`\`\``;
      }
    } else {
      // For non-code content, still add the file path and wrap in code block
      processedContent = `${filePathSection}\`\`\`\n${content}\n\`\`\``;
    }

    // Handle insertion at cursor position
    return [
      currentContent.slice(0, cursorPosition),
      processedContent,
      currentContent.slice(cursorPosition)
    ].join('');
  } catch (error) {
    console.error('Error processing content:', error);
    // Fallback with file path
    const filePathSection = filePath ? `${filePath}\n` : '';
    return [
      currentContent.slice(0, cursorPosition),
      `${filePathSection}${content}`,
      currentContent.slice(cursorPosition)
    ].join('');
  }
};
