import React from 'react';

interface DiagramSourceProps {
  content: string;
}

const DiagramSource: React.FC<DiagramSourceProps> = ({ content }) => (
  <details className="mt-2">
    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
      Show diagram source
    </summary>
    <pre className="mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
      <code>{content}</code>
    </pre>
  </details>
);

export default DiagramSource;
