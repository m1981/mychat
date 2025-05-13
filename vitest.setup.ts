import { vi, expect, beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Add Jest compatibility
(global as any).jest = vi;

// Extend Window interface for mocks
type MockableFunction = Function & {
  mockImplementation?: typeof vi.fn;
};

// Augment the Window interface instead of redeclaring it
declare global {
  interface Window {
    localStorage: {
      getItem: ReturnType<typeof vi.fn>;
      setItem: ReturnType<typeof vi.fn>;
      removeItem: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };
  }
}

import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import i18n from './src/utils/i18n-test-config';

// Add custom matchers
expect.extend(matchers);

// Initialize i18n for tests
beforeAll(() => {
  i18n.init();
});

// Add error boundary testing support
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Add fetch mock
beforeAll(() => {
  global.fetch = vi.fn();
  global.Request = vi.fn() as unknown as typeof Request;
  global.Headers = vi.fn() as unknown as typeof Headers;
});

// Add intersection observer mock
beforeAll(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: []
  })) as unknown as typeof IntersectionObserver;
});

// Mock window.scrollTo
beforeAll(() => {
  // Use a different approach - mock the method directly without type declaration
  window.scrollTo = vi.fn() as any;
});

// Mock localStorage
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    },
    writable: true
  });
});

// Improve cleanup
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver;

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

// Common document mocks
beforeAll(() => {
  // Mock document.execCommand which is used in multiple tests
  document.execCommand = vi.fn().mockReturnValue(false);
  
  // Other common mocks...
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
