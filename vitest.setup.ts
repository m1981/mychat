import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Add Jest compatibility
global.jest = vi;

declare global {
  interface Window {
    scrollTo: typeof vi.fn;
    localStorage: {
      getItem: typeof vi.fn;
      setItem: typeof vi.fn;
      removeItem: typeof vi.fn;
      clear: typeof vi.fn;
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
  global.Request = vi.fn();
  global.Headers = vi.fn();
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
  }));
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
}));

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
}));

// Common document mocks
beforeAll(() => {
  // Mock document.execCommand which is used in multiple tests
  global.document.execCommand = vi.fn().mockReturnValue(false);
  
  // Other common mocks...
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
