import React from 'react';
import { ModelConfig } from '@type/provider';
import { CapabilityContext } from '@type/capability';

interface ThinkingModeToggleProps {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
  context?: CapabilityContext;
}

export const ThinkingModeToggle: React.FC<ThinkingModeToggleProps> = ({
  modelConfig,
  setModelConfig,
  context
}) => {
  const isEnabled = modelConfig.thinking_mode?.enabled || false;
  const budgetTokens = modelConfig.thinking_mode?.budget_tokens || 16000;
  
  const handleToggle = () => {
    setModelConfig({
      ...modelConfig,
      thinking_mode: {
        enabled: !isEnabled,
        budget_tokens: budgetTokens
      }
    });
  };
  
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setModelConfig({
      ...modelConfig,
      thinking_mode: {
        enabled: isEnabled,
        budget_tokens: isNaN(value) ? 16000 : value
      }
    });
  };
  
  // Only show if the capability is supported
  if (!context || !context.provider) return null;
  
  return (
    <div className="thinking-mode-container">
      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="thinking-mode-toggle"
          checked={isEnabled}
          onChange={handleToggle}
          className="mr-2"
        />
        <label htmlFor="thinking-mode-toggle" className="text-sm font-medium">
          Enable Thinking Mode
        </label>
      </div>
      
      {isEnabled && (
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
        </div>
      )}
    </div>
  );
};