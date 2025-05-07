# MessageContent Refactoring Plan

## Testing Principles (from principles_tests.md)

1. **Keep Tests READABLE**
   - Write clear, descriptive test names
   - Use meaningful variable names
   - Structure tests in Given-When-Then format
   - Make test intention obvious

2. **Keep Tests ISOLATED**
   - Each test should be independent
   - No dependencies between tests
   - Tests should be able to run in any order
   - Clean up after each test

3. **Test ONE THING at a time**
   - One logical assertion per test
   - Test single behavior/feature
   - Avoid testing multiple scenarios in one test
   - Keep tests focused

4. **Write MAINTAINABLE tests**
   - Don't duplicate test code (use setup methods)
   - Keep test code simple
   - Update tests when requirements change
   - Remove obsolete tests

5. **Test BEHAVIOR, not implementation**
   - Focus on what, not how
   - Test public interfaces
   - Don't test private methods
   - Write tests from user's perspective

## Progress Tracking

### Completed
- ✅ Created MessageEditorContext with useMessageEditorContext hook
- ✅ Added tests for MessageEditorContext
- ✅ Implemented useMessageEditor hook
- ✅ Added tests for useMessageEditor hook
- ✅ Implemented MessageEditorProvider component
- ✅ Added tests for MessageEditorProvider
- ✅ Fixed usePasteHandler tests

### In Progress
- 🔄 Implementing supporting hooks for EditView

### Pending
- EditView component
- ContentView component
- Integration with MessageContent

## Next Steps

### Phase 1: Implement Supporting Hooks (Current Phase)
1. **Implement/Refactor Supporting Hooks**
   - ✅ Fix usePasteHandler tests
   - 🔄 Implement useKeyboardShortcuts (depends on useMessageEditorContext)
   - Implement useFileDropHandler (for drag and drop file handling)
   - Implement useTextareaFocus (for auto-focusing and cursor positioning)
   - Test all hooks thoroughly

### Phase 2: Implement EditView Component
1. **Create EditView Component**
   - Use useMessageEditorContext to access editing state and methods
   - Integrate supporting hooks (useKeyboardShortcuts, usePasteHandler, etc.)
   - Implement auto-resizing textarea
   - Handle keyboard events and shortcuts
   - Test component with mock context

2. **Create EditViewButtons Component**
   - Use useMessageEditorContext to access state and methods
   - Implement conditional rendering based on context (composer vs. editing)
   - Add appropriate button handlers
   - Test component with mock context

### Phase 3: Implement ContentView Component
1. **Create ContentView Component**
   - Extract from current implementation
   - Ensure proper markdown rendering
   - Handle special elements (code blocks, math, tables)
   - Test rendering with various content types

### Phase 4: Refactor MessageContent
1. **Update MessageContent Component**
   - Conditionally render ContentView or MessageEditorProvider+EditView
   - Pass appropriate props to each component
   - Ensure backward compatibility
   - Test with both view and edit modes

## Missing Components/Connections (Now Addressed)
- EditView and ContentView
  - ❌ Not yet implemented
  - According to the diagram, EditView should use useMessageEditorContext and several other hooks
- Supporting Hooks
  - 🔄 useKeyboardShortcuts (in progress)
  - ✅ usePasteHandler (tests fixed)
  - ❌ useFileDropHandler
  - ❌ useTextareaFocus
- MessageContent
  - ❌ Not yet refactored to use the new components

## Implementation Order
1. Complete supporting hooks (current phase)
   - These are dependencies for EditView
   - Start with useKeyboardShortcuts as it directly depends on useMessageEditorContext
2. Implement EditView
   - This will use the context and supporting hooks
   - Will be a child of MessageEditorProvider
3. Implement ContentView
   - This is independent of the editing functionality
   - Can be implemented in parallel
4. Finally, refactor MessageContent
   - To conditionally render ContentView or MessageEditorProvider with EditView
