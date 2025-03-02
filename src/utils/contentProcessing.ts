// src/utils/contentProcessing.ts
import { detectCodeContent } from '@utils/languageDetection';

export const processContent = (
  content: string,
  cursorPosition: number,
  currentContent: string,
  filePath?: string
): string => {
  try {
    const detection = detectCodeContent(content);

    let processedContent = content;

    // Add file path if provided
    const filePathSection = filePath ? `${filePath}\n` : '';

    // Check if content is already wrapped in code blocks
    if (content.trim().startsWith('```') && content.trim().endsWith('```')) {
      return [
        currentContent.slice(0, cursorPosition),
        content,
        currentContent.slice(cursorPosition)
      ].join('');
    }

    if (detection?.isCode) {
      const language = detection.type === 'mixed'
        ? detection.subLanguages?.[0] || 'text'
        : detection.language;

      processedContent = `${filePathSection}\`\`\`${language}\n${content}\n\`\`\``;
    } else if (content.includes('\n')) {
      // Multi-line non-code content should still be wrapped
      processedContent = `${filePathSection}\`\`\`text\n${content}\n\`\`\``;
    } else {
      // Single line content doesn't need wrapping
      processedContent = `${filePathSection}${content}`;
    }

    // Handle insertion at cursor position
    return [
      currentContent.slice(0, cursorPosition),
      processedContent,
      currentContent.slice(cursorPosition)
    ].join('');
  } catch (error) {
    console.error('Error processing content:', error);
    return [
      currentContent.slice(0, cursorPosition),
      content,
      currentContent.slice(cursorPosition)
    ].join('');
  }
};

export const formatDroppedContent = (
  content: string,
  filePath?: string
): string => {
  try {
    const detection = detectCodeContent(content);
    const filePathSection = filePath ? `${filePath}\n` : '';

    if (content.trim().startsWith('```') && content.trim().endsWith('```')) {
      return content;
    }

    if (detection?.isCode) {
      const language = detection.type === 'mixed'
        ? detection.subLanguages?.[0] || 'text'
        : detection.language;
      return `${filePathSection}\`\`\`${language}\n${content}\n\`\`\``;
    } else if (content.includes('\n')) {
      return `${filePathSection}\`\`\`text\n${content}\n\`\`\``;
    }
    
    return `${filePathSection}${content}`;
  } catch (error) {
    console.error('Error formatting content:', error);
    return content;
  }
};
