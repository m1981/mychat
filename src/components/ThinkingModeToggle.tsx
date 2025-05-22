import React from 'react';
import { ModelConfig } from '@config/types';
import { useChatConfig } from '@hooks/useConfiguration';

interface ThinkingModeToggleProps {
  chatId: string;
}

const ThinkingModeToggle: React.FC<ThinkingModeToggleProps> = ({ chatId }) => {
  const { isCapabilityEnabled, updateCapabilityConfig } = useChatConfig(chatId);
  
  // Get current state
  const enabled = isCapabilityEnabled('thinking_mode');
  
  // Get current budget tokens
  const { config } = useChatConfig(chatId);
  const budgetTokens = config.modelConfig.capabilities?.thinking_mode?.budget_tokens || 16000;
  
  // Toggle thinking mode
  const handleToggle = () => {
    updateCapabilityConfig('thinking_mode', { enabled: !enabled });
  };
  
  // Update budget tokens
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      updateCapabilityConfig('thinking_mode', { budget_tokens: value });
    }
  };
  
  return (
    <div className="mb-4">
      <div className="flex items-center">
        <input
          type="checkbox"
          id="thinking-mode"
          checked={enabled}
          onChange={handleToggle}
          className="mr-2"
        />
        <label htmlFor="thinking-mode" className="text-sm">
          Enable Thinking Mode
        </label>
      </div>
      
      {enabled && (
        <div className="ml-6">
          <label className="block text-sm mb-1">Token Budget:</label>
          <input
            type="number"
            value={budgetTokens}
            onChange={handleBudgetChange}
            min="1000"
            max="100000"
            step="1000"
            className="w-full p-1 text-sm border rounded"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher values allow more thinking but use more tokens.
          </p>
        </div>
      )}
    </div>
  );
};

export default ThinkingModeToggle;