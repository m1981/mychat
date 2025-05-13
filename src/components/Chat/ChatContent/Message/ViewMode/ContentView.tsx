import React from 'react';
import { DetailedHTMLProps, HTMLAttributes } from 'react';

import ReactMarkdown from 'react-markdown';
import { CodeProps } from 'react-markdown/lib/ast-to-react';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import CodeBlock from '../CodeBlock';

// Lazy load MermaidDiagram to reduce initial bundle size
// Try a different approach with a more explicit path
const MermaidDiagram = React.lazy(() => import('@components/Chat/ChatContent/Message/MermaidComponent'));

interface ContentViewProps {
  content: string;
}

// Helper component for paragraph rendering
const p = (props: DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>) => {
  return <p className="whitespace-pre-wrap">{props.children}</p>;
};

// Code renderer component
const code = React.memo<CodeProps>(({ inline, className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match && match[1];

  if (inline) {
    return <code className={className}>{children}</code>;
  }

  if (lang === 'mermaid') {
    return (
      <React.Suspense fallback={<div>Loading diagram...</div>}>
        <MermaidDiagram content={String(children).trim()} />
      </React.Suspense>
    );
  }

  return <CodeBlock lang={lang || 'text'} codeChildren={children} />;
});

/**
 * ContentView component - Renders markdown content with syntax highlighting
 */
const ContentView = React.memo<ContentViewProps>(({ content }) => {
  return (
    <div className='markdown prose w-full md:max-w-full break-words dark:prose-invert dark share-gpt-message'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
        rehypePlugins={[
          rehypeKatex,
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        linkTarget='_new'
        components={{ code, p }}
      >
        {content.replace(/```svelte/g, '```')}
      </ReactMarkdown>
    </div>
  );
});

ContentView.displayName = 'ContentView';

export default ContentView;