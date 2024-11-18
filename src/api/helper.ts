import { EventSourceData } from '@type/api';

// src/api/helper.ts
export const parseEventSource = (raw: string): any[] => {
  const result: any[] = [];
  const events = raw.split('\n\n').filter(Boolean);

  for (const event of events) {
    if (event.trim() === '[DONE]') {
      result.push('[DONE]');
      continue;
    }

    const lines = event.split('\n');
    let data = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        data = line.slice(6).trim();
        try {
          const jsonData = JSON.parse(data);
          result.push(jsonData);
        } catch (e) {
          console.warn('Failed to parse SSE data:', data);
        }
      }
    }
  }

  return result;
};