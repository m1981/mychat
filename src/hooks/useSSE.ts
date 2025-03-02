import { useEffect, useRef } from 'react';

const RECONNECT_INTERVAL = 3000; // 3 seconds

interface ReconnectConfig {
  enabled?: boolean;
  maxAttempts?: number;
  interval?: number;
}

interface SSEOptions {
  onMessage: (event: MessageEvent) => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  reconnect?: ReconnectConfig;
}

function createEventSource(url: string, attempt: number = 0): EventSource {
  console.log(`🔍 Creating EventSource, attempt ${attempt}`);
  return new EventSource(url);
}

export function useSSE(url: string, options: SSEOptions) {
  console.log('🔍 Hook called with:', { url, options });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanup = () => {
    console.log('🔍 Cleanup running');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      // Remove all event listeners before closing
      eventSourceRef.current.removeEventListener('message', options.onMessage);
      if (options.onError) {
        eventSourceRef.current.removeEventListener('error', options.onError);
      }
      if (options.onOpen) {
        eventSourceRef.current.removeEventListener('open', options.onOpen);
      }
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  useEffect(() => {
    console.log('🔍 Effect running');

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    console.log('🔍 EventSource created');

    // Add event listeners
    eventSource.addEventListener('message', options.onMessage);
    if (options.onError) {
      eventSource.addEventListener('error', options.onError);
    }
    if (options.onOpen) {
      eventSource.addEventListener('open', options.onOpen);
    }

    return cleanup;
  }, [url, options.onMessage, options.onError, options.onOpen]);

  return {
    close: () => {
      console.log('🔍 Manual close called');
      cleanup();
    }
  };
}