import React, { useRef, useState, useEffect } from 'react';
import { loadMermaid } from './utils';

const ExportButtons = React.lazy(() => import('./ExportButtons'));
const DiagramSource = React.lazy(() => import('./DiagramSource'));

interface DangerousHTML {
  __html: string;
}

const MermaidDiagram: React.FC<{ content: string }> = ({ content }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!elementRef.current) return;

      try {
        const mermaid = await loadMermaid();

        mermaid.initialize({
          startOnLoad: false,
          theme: 'forest',
          securityLevel: 'loose',
          htmlLabels: true,
          themeVariables: {
            fontFamily: 'arial',
            fontSize: '16px'
          }
        });

        const { svg } = await mermaid.render(
          `mermaid-${Math.random().toString(36).substr(2, 9)}`,
          content
        );
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [content]);

  return (
    <div className="mermaid-container">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
    <div
      ref={elementRef}
  className="mermaid-diagram"
  dangerouslySetInnerHTML={{ __html: svg } as DangerousHTML}
  />
  <React.Suspense fallback={<div>Loading export options...</div>}>
  <ExportButtons content={content} svg={svg} elementRef={elementRef} />
  </React.Suspense>
  </div>

  <React.Suspense fallback={<div>Loading source view...</div>}>
  <DiagramSource content={content} />
  </React.Suspense>

  {error && (
    <div className="text-red-500 p-4 border border-red-300 rounded mt-2">
      <p>Error rendering diagram: {error}</p>
  <pre className="mt-2 text-sm">{content}</pre>
    </div>
  )}
  </div>
);
};

  export default MermaidDiagram;
