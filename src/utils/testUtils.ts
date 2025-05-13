import { StoreState } from '@store/store';
import { vi } from 'vitest';

// Document event listener mocks
export const mockDocumentListeners = () => {
  vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
  vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
};

// Common event mocks
export const createMockEvent = (overrides = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ...overrides
});

// Mock textarea element
export const createMockTextarea = () => {
  const mockTextarea = document.createElement('textarea');
  mockTextarea.focus = vi.fn();
  mockTextarea.setSelectionRange = vi.fn();
  mockTextarea.scrollIntoView = vi.fn();
  mockTextarea.addEventListener = vi.fn();
  mockTextarea.removeEventListener = vi.fn();
  return mockTextarea;
};

// Store mock helper
export const mockStore = (initialState: Partial<StoreState>) => {
  return vi.fn().mockImplementation((selector) => 
    selector({ ...initialState } as StoreState)
  );
};

// Timer helpers
export const setupTimers = () => {
  vi.useFakeTimers();
  return () => vi.useRealTimers();
};