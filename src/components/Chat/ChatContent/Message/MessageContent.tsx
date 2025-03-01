import React from 'react';
import ReactMarkdown from 'react-markdown';
import { CodeProps } from 'react-markdown/lib/ast-to-react';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import CodeBlock from './CodeBlock';
import { Role } from '@type/chat';
const MermaidDiagram = React.lazy(() => import('./MermaidComponent/index'));

interface MessageContentProps {
  role: Role;
  content: string;
  messageIndex: number;
  isComposer?: boolean;
  isEdit?: boolean;
  setIsEdit?: React.Dispatch<React.SetStateAction<boolean>>;
  isEditing?: boolean;
  setIsEditing?: React.Dispatch<React.SetStateAction<boolean>>;
}

const Code = React.memo<CodeProps>(({ inline, className, children }) => {
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

const MessageContent: React.FC<MessageContentProps> = ({
  role,
  content,
  messageIndex,
  isComposer,
  isEdit,
  setIsEdit,
  isEditing,
  setIsEditing
}) => {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          code: Code
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
export default MessageContent;

