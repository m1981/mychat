// utils.ts
import { compressToEncodedURIComponent } from 'lz-string';
import mermaid from 'mermaid';

export const getMermaidLiveLink = (code: string) => {
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

export const loadMermaid = async () => {
  return mermaid;  // Return the imported mermaid instance directly
};
