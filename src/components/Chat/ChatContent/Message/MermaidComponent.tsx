// MermaidComponents.tsx
import { compressToEncodedURIComponent } from 'lz-string';
import type { MermaidConfig } from 'mermaid';
import React, { useRef, useState, useEffect } from 'react';
interface DangerousHTML {
  __html: string;
}

// Utility functions
const getMermaidLiveLink = (code: string) => {
  try {
    const state = {
      code: code.replace(/\r\n/g, '\n').replace(/\n\s+/g, '\n    '),
      mermaid: '{\n  "theme": "default"\n}',
      autoSync: true,
      rough: false,
      updateDiagram: false,
      panZoom: true,
      pan: { x: 168.09754057939372, y: 116.10714911357914 },
      zoom: 0.6777827739715576
    };
    return `https://mermaid.live/edit#pako:${compressToEncodedURIComponent(JSON.stringify(state))}`;
  } catch (error) {
    console.error('Error generating link:', error);
    return '#error';
  }
};

// Export buttons component
const ExportButtons = ({ content, svg, elementRef }: {
  content: string;
  svg: string;
  elementRef: React.RefObject<HTMLDivElement>;
}) => {
  const downloadSVG = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = async () => {
    if (!svg) return;

    const svgElement = elementRef.current?.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

    await new Promise<void>((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve();
      };
    });
  };


  return (
    <div className="mt-4 flex gap-2 justify-end">
      <button
        onClick={() => window.open(getMermaidLiveLink(content), '_blank')}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Edit in Mermaid Live
      </button>
      <button
        onClick={downloadSVG}
        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
      >
        Download SVG
      </button>
      <button
        onClick={downloadPNG}
        className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
      >
        Download PNG
      </button>
    </div>
  );
};

// Source code display component
export const DiagramSource = ({ content }: { content: string }) => (
  <details className="mt-2">
    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
      Show diagram source
    </summary>
    <pre className="mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
      <code>{content}</code>
    </pre>
  </details>
);

// Main Mermaid component
export const MermaidDiagram = ({ content }: { content: string }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!elementRef.current) return;

      try {
        const mermaid = (await import('mermaid')).default;

      // Using Partial<MermaidConfig> since we don't need all properties
      const config: Partial<MermaidConfig> = {
          startOnLoad: false,
          theme: 'forest',
        securityLevel: 'loose' as const,
        htmlLabels: true,
        themeVariables: {
          fontFamily: 'arial',
          fontSize: '16px'
        }
        };

      // Initialize with the config
        mermaid.initialize(config);

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
        <ExportButtons content={content} svg={svg} elementRef={elementRef} />
      </div>

      <DiagramSource content={content} />

      {error && (
        <div className="text-red-500 p-4 border border-red-300 rounded mt-2">
          <p>Error rendering diagram: {error}</p>
          <pre className="mt-2 text-sm">{content}</pre>
        </div>
      )}
    </div>
  );
};
