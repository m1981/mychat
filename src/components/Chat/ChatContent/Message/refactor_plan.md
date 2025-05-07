# MessageContent Refactoring Plan

## Progress Tracking

### Completed
- ✅ Created MessageEditorContext with useMessageEditorContext hook
- ✅ Added tests for MessageEditorContext
- ✅ Implemented useMessageEditor hook
- ✅ Added tests for useMessageEditor hook
- ✅ Implemented MessageEditorProvider component
- ✅ Added tests for MessageEditorProvider
- ✅ Fixed usePasteHandler tests
- ✅ Implemented useKeyboardShortcuts (depends on useMessageEditorContext)
- ✅ Added tests for useKeyboardShortcuts
- ✅ Implemented useTextareaFocus (for auto-focusing and cursor positioning)
- ✅ Added tests for useTextareaFocus
- ✅ Implemented useTextSelection
- ✅ Added tests for useTextSelection

### In Progress
- 🔄 Extracting ContentView component

### Pending
- ❌ Add tests for ContentView
- ❌ EditView component
- ❌ EditViewButtons component
- ❌ Integration with MessageContent

## Next Steps

### Phase 1: Implement Supporting Hooks (100% Complete)
1. **Implement/Refactor Supporting Hooks**
   - ✅ Fix usePasteHandler tests
   - ✅ Implement useKeyboardShortcuts (depends on useMessageEditorContext)
   - ✅ Implement useTextareaFocus (for auto-focusing and cursor positioning)
   - ✅ Implement useTextSelection (for handling text selection)
   - ✅ Test other hooks thoroughly

### Phase 2: Extract ContentView Component (50% Complete)
1. **Extract ContentView Component**
   - 🔄 Extract from current implementation
   - 🔄 Ensure proper markdown rendering
   - 🔄 Handle special elements (code blocks, math, tables)
   - ❌ Add tests for ContentView with various content types

### Phase 3: Implement EditView Component (0% Complete)
1. **Create EditView Component**
   - ❌ Use useMessageEditorContext to access editing state and methods
   - ❌ Integrate supporting hooks (useKeyboardShortcuts, usePasteHandler, etc.)
   - ❌ Implement auto-resizing textarea
   - ❌ Handle keyboard events and shortcuts
   - ❌ Test component with mock context

2. **Create EditViewButtons Component**
   - ❌ Use useMessageEditorContext to access state and methods
   - ❌ Implement conditional rendering based on context (composer vs. editing)
   - ❌ Add appropriate button handlers
   - ❌ Test component with mock context

### Phase 4: Refactor MessageContent (0% Complete)
1. **Update MessageContent Component**
   - ❌ Conditionally render ContentView or MessageEditorProvider+EditView
   - ❌ Pass appropriate props to each component
   - ❌ Ensure backward compatibility
   - ❌ Test with both view and edit modes

## Implementation Order (Revised)

1. Complete ContentView extraction and tests
2. Implement EditView and EditViewButtons
   - These will use the context and supporting hooks
3. Finally, refactor MessageContent
   - To conditionally render ContentView or MessageEditorProvider with EditView

## Component Status

| Component/Hook | Status | Notes |
|----------------|--------|-------|
| MessageEditorContext | ✅ Complete | With tests |
| useMessageEditor | ✅ Complete | With tests |
| MessageEditorProvider | ✅ Complete | With tests |
| usePasteHandler | ✅ Complete | With tests |
| useKeyboardShortcuts | ✅ Complete | With tests |
| useTextareaFocus | ✅ Complete | With tests |
| useTextSelection | ✅ Complete | With tests |
| ContentView | 🔄 In Progress | Extraction in progress |
| EditView | ❌ Not Started | Depends on hooks |
| EditViewButtons | ❌ Not Started | Depends on EditView |
| MessageContent (refactored) | ❌ Not Started | Final integration |


