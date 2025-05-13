
# Test Files Refactoring Plan

## Goals
1. Standardize Vitest usage across test files
2. Eliminate duplication of mock utilities
3. Improve test maintainability and readability
4. Ensure consistent patterns across all test files

## Existing Utilities in `src/utils/test-utils.tsx`
- ✅ Provider wrappers for testing with i18n
- ✅ Custom render functions for components with MessageEditorContext
- ✅ Document listener mocks with `mockDocumentListeners()`
- ✅ Mock event creation with `createMockEvent()`
- ✅ Mock textarea creation with `createMockTextarea()`
- ✅ Store mocking with `mockStore()`
- ✅ Timer setup with `setupTimers()`

## Files to Refactor

### 1. `src/hooks/__tests__/useKeyboardShortcuts.test.tsx`
- [x] Import utilities from `@utils/test-utils`
- [x] Use `mockDocumentListeners()` with proper cleanup
- [x] Use `createMockEvent()` for test events
- [x] Standardize Vitest import pattern
- [x] Use consistent `it()` for test cases
- [x] Add proper cleanup in `afterEach`

### 2. `src/hooks/__tests__/useTextareaFocus.test.tsx`
- [x] Use `createMockTextarea()` instead of creating mock textarea in the test
- [x] Use `setupTimers()` for timer management
- [x] Standardize Vitest import pattern
- [x] Use consistent test patterns
- [x] Simplify test structure and remove redundant tests

### 3. `src/hooks/__tests__/useTextSelection.test.tsx`
- [x] Use `mockDocumentListeners()` with proper cleanup
- [x] Standardize Vitest import pattern
- [x] Use consistent test patterns
- [x] Fix type issues with mocked functions

### 4. `src/hooks/__tests__/useSSE.test.ts`
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns
- [ ] Extract common mock setup to reusable functions
- [ ] Use `setupTimers()` for timer management
- [ ] Use proper type safety with `vi.mocked()`

### 5. `src/hooks/__tests__/usePasteHandler.test.tsx`
- [ ] Use `createMockEvent()` for test events
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns

### 6. `src/hooks/__tests__/useFileDropHandler.test.tsx`
- [ ] Use `createMockEvent()` for test events
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns

### 7. `src/components/Menu/__tests__/NewChat.test.tsx`
- [ ] Use `mockStore()` for store mocking
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns

### 8. `src/components/Chat/ChatContent/Message/__tests__/ContentView.test.tsx`
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns
- [ ] Extract common render logic to utility functions

### 9. `src/components/Chat/ChatContent/Message/__tests__/EditView.test.tsx`
- [ ] Use `renderWithMessageEditor()` for testing with context
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns

### 10. `src/server/sse/__tests__/SSEConnection.test.ts`
- [ ] Use `setupTimers()` for timer management
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns

### 11. `src/config/providers/__tests__/provider.registry.test.ts`
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns

### 12. `src/config/models/__tests__/model.registry.test.ts`
- [ ] Standardize Vitest import pattern
- [ ] Use consistent test patterns

## Progress Tracking
- [x] File 1: `useKeyboardShortcuts.test.tsx`
- [x] File 2: `useTextareaFocus.test.tsx`
- [x] File 3: `useTextSelection.test.tsx`
- [ ] File 4: `useSSE.test.ts`
- [ ] File 5: `usePasteHandler.test.tsx`
- [ ] File 6: `useFileDropHandler.test.tsx`
- [ ] File 7: `NewChat.test.tsx`
- [ ] File 8: `ContentView.test.tsx`
- [ ] File 9: `EditView.test.tsx`
- [ ] File 10: `SSEConnection.test.ts`
- [ ] File 11: `provider.registry.test.ts`
- [ ] File 12: `model.registry.test.ts`

## Additional Improvements
- [x] Update `vitest.setup.ts` with proper TypeScript types
- [x] Fix global mocks to use proper typing with `as unknown as Type`
- [x] Improve cleanup in test files by using returned cleanup functions
- [x] Use `vi.mocked()` consistently for type safety when accessing mock properties
- [ ] Ensure consistent use of `vi.mocked()` for type safety across all files
- [ ] Add explicit return type annotations to mock functions where appropriate
- [ ] Consider extracting common EventSource mocking to test utilities
