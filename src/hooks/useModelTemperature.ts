export function useModelTemperature(chatId?: string) {
  // Get current chat ID if not provided
  const currentChatId = useStore(state => {
    if (chatId) return chatId;
    const { chats, currentChatIndex } = state;
    return chats[currentChatIndex]?.id;
  });
  
  // Get and set temperature with memoization
  const temperature = useStore(
    state => state.getChatConfig(currentChatId)?.modelConfig.temperature
  );
  
  const setTemperature = useCallback((value: number) => {
    useStore.getState().updateChatConfig(currentChatId, {
      modelConfig: { temperature: value }
    });
  }, [currentChatId]);
  
  return [temperature, setTemperature] as const;
}