import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { setupMockLocalStorage } from './test-utils';

// Setup mock localStorage
let mockLocalStorage: ReturnType<typeof setupMockLocalStorage>;

beforeAll(() => {
  // Setup global mocks
  mockLocalStorage = setupMockLocalStorage();
  
  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Mock window.fetch
  global.fetch = vi.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      status: 200,
      statusText: 'OK',
      headers: new Headers()
    })
  );
  
  // Mock ReadableStream if not available in test environment
  if (typeof ReadableStream === 'undefined') {
    global.ReadableStream = class MockReadableStream {
      constructor(options: any) {
        setTimeout(() => {
          if (options && options.start) {
            const controller = {
              enqueue: (chunk: any) => {},
              close: () => {},
              error: (e: any) => {}
            };
            options.start(controller);
          }
        }, 0);
      }
    } as any;
  }
});

afterAll(() => {
  // Restore console methods
  vi.restoreAllMocks();
});

afterEach(() => {
  // Clear localStorage between tests
  mockLocalStorage.clear();
  
  // Reset fetch mock
  vi.mocked(fetch).mockClear();
});