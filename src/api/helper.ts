
type SSEResult = {
  event: string;
  data: any;
} | '[DONE]';

export const parseEventSource = (raw: string): SSEResult[] => {
  const result: SSEResult[] = [];
  const events = raw.split('\n\n').filter(Boolean);

  for (const event of events) {
    if (event.trim() === '[DONE]') {
      result.push('[DONE]');
      continue;
    }

    const lines = event.split('\n');
    let eventType = '';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.slice(6).trim();
        try {
          result.push({
            data: JSON.parse(data),
            event: eventType
          });
        } catch (e) {
          console.warn('Failed to parse SSE data:', data);
        }
      }
    }
  }

  return result;
};