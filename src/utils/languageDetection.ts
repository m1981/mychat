// src/utils/languageDetection.ts
import hljs from 'highlight.js';

export interface CodeDetectionResult {
  isCode: boolean;
  language: string;
  relevance: number;
}

// Fix: Make type more specific and properly extend CodeDetectionResult
interface ExtendedCodeDetectionResult extends CodeDetectionResult {
  isCode: true; // Narrow the type
  type: 'code' | 'patch' | 'mermaid' | 'makefile' | 'mixed';
  subLanguages: string[] | undefined; // Allow undefined
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
        type: type as 'code' | 'patch' | 'mermaid' | 'makefile' | 'mixed',
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

// Add null checks for language detection
export function detectLanguage(text: string): ExtendedCodeDetectionResult | null {
  try {
    const result = hljs.highlightAuto(text);
    if (!result.language) {
      return null;
    }
    
    return {
      isCode: true,
      type: 'code',
      language: result.language,
      relevance: result.relevance,
      subLanguages: result.secondBest?.language ? [result.secondBest.language] : []
    };
  } catch (error) {
    return null;
  }
}

// Add null checks for language operations
export function processLanguage(lang: string | undefined): string {
  if (!lang) return 'text';  // Default fallback
  return lang.toLowerCase();
}
