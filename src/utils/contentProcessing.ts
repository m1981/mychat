// src/utils/contentProcessing.ts
import { detectCodeContent } from '@utils/languageDetection';

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
