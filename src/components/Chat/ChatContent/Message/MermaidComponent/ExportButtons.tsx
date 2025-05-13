import React from 'react';

import { getMermaidLiveLink } from './utils';

interface ExportButtonsProps {
  content: string;
  svg: string;
  elementRef: React.RefObject<HTMLDivElement>;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ content, svg, elementRef }) => {
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

export default ExportButtons;
