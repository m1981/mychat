import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { vi } from 'vitest';
import i18n from './i18n-test-config';
import { MessageEditorProvider } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import { StoreState } from '@store/store';

// React component providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
};

export const createWrapper = () => AllTheProviders;

// Custom render with i18n provider
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => ({
  user: userEvent.setup(),
  ...render(ui, { wrapper: AllTheProviders, ...options })
});

// Custom render for components that need MessageEditorContext
export function renderWithMessageEditor(
  ui: React.ReactElement,
  options?: RenderOptions & { editorProps?: any }
) {
  const { editorProps = {}, ...renderOptions } = options || {};
  
  return render(
    <MessageEditorProvider 
      initialContent=""
      handleSave={vi.fn()}
      handleSaveAndSubmit={vi.fn()}
      setIsEdit={vi.fn()}
      setIsEditing={vi.fn()}
      {...editorProps}
    >
      {ui}
    </MessageEditorProvider>,
    renderOptions
  );
}

// Vitest mock utilities

/**
 * Mocks document event listeners for testing
 * Use in beforeEach to avoid test interference
 */
export const mockDocumentListeners = () => {
  vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
  vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  return () => {
    vi.mocked(document.addEventListener).mockRestore();
    vi.mocked(document.removeEventListener).mockRestore();
  };
};

/**
 * Creates a mock event object with common methods
 */
export const createMockEvent = (overrides = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ...overrides
});

/**
 * Creates a mock textarea element with common methods
 */
export const createMockTextarea = () => {
  const mockTextarea = document.createElement('textarea');
  mockTextarea.focus = vi.fn();
  mockTextarea.setSelectionRange = vi.fn();
  mockTextarea.scrollIntoView = vi.fn();
  mockTextarea.addEventListener = vi.fn();
  mockTextarea.removeEventListener = vi.fn();
  return mockTextarea;
};

/**
 * Creates a mock store with initial state
 */
export const mockStore = (initialState: Partial<StoreState>) => {
  return vi.fn().mockImplementation((selector) => 
    selector({ ...initialState } as StoreState)
  );
};

/**
 * Sets up fake timers and returns cleanup function
 */
export const setupTimers = () => {
  vi.useFakeTimers();
  return () => vi.useRealTimers();
};

export * from '@testing-library/react';
export { customRender as render };
export { userEvent };