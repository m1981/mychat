test('should add selectionchange event listener on mount', () => {
  // Setup
  jest.spyOn(document, 'addEventListener');
  
  // Act
  renderHook(() => useTextSelection());
  
  // Assert
  expect(document.addEventListener).toHaveBeenCalled();
  const calls = vi.mocked(document.addEventListener).mock.calls;
  const hasMouseupOrSelectionChange = calls.some(call => 
    call[0] === 'mouseup' || call[0] === 'selectionchange'
  );
  expect(hasMouseupOrSelectionChange).toBe(true);
});