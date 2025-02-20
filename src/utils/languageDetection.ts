// src/utils/languageDetection.ts
import hljs from 'highlight.js';

export interface CodeDetectionResult {
  isCode: boolean;
  language: string;
  relevance: number;
}
interface ExtendedCodeDetectionResult extends CodeDetectionResult {
  type: 'code' | 'patch' | 'mermaid' | 'makefile' | 'mixed';
  subLanguages?: string[];
}

const SPECIAL_PATTERNS = {
  patch: /^Index:|^diff --git|^@@\s[-+\d,]+\s[-+\d,]+\s@@/m,
  mermaid: /^(graph|pie|sequenceDiagram|gantt|classDiagram|erDiagram|flowchart|stateDiagram)/m,
  makefile: /^\.PHONY:|^\t\$\(.*\)/m,
  mixed: /^<script>|^<style>|^<template>/m
};

export const detectCodeContent = (content: string): ExtendedCodeDetectionResult | null => {
  // First check for special formats
  for (const [type, pattern] of Object.entries(SPECIAL_PATTERNS)) {
    if (pattern.test(content)) {
      return {
        isCode: true,
        type: type as any,
        language: type,
        relevance: 10,
        subLanguages: type === 'mixed' ? detectSubLanguages(content) : undefined
      };
    }
  }

  // Fallback to highlight.js detection
  try {
    const detection = hljs.highlightAuto(content, [
      'javascript', 'typescript', 'python', 'java', 'go',
      'rust', 'cpp', 'c', 'csharp', 'ruby', 'php',
      'dockerfile', 'yaml', 'json', 'html', 'css',
      'sql', 'bash', 'shell', 'terraform', 'hcl',
      'diff', 'makefile', 'mermaid'
    ]);

    if (detection.relevance > 5) {
      return {
        isCode: true,
        type: 'code',
        language: detection.language || 'text',
        relevance: detection.relevance
      };
    }
  } catch (error) {
    console.warn('Language detection failed:', error);
  }

  return null;
};

const detectSubLanguages = (content: string): string[] => {
  const languages: string[] = [];

  // Detect languages in script tags
  const scriptMatch = content.match(/<script.*?lang=["'](.+?)["']/);
  if (scriptMatch) languages.push(scriptMatch[1]);

  // Detect languages in style tags
  const styleMatch = content.match(/<style.*?lang=["'](.+?)["']/);
  if (styleMatch) languages.push(styleMatch[1]);

  return languages;
};
