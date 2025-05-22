// A registry of provider capabilities with their UI components
export interface CapabilityDefinition {
  id: string;
  isSupported: (provider: ProviderKey, model: string) => boolean;
  configComponent: React.ComponentType<{
    modelConfig: ModelConfig;
    setModelConfig: (config: ModelConfig) => void;
  }>;
}

// Register capabilities
export const capabilityRegistry: CapabilityDefinition[] = [
  {
    id: 'thinking',
    isSupported: (provider) => 
      PROVIDER_CONFIGS[provider]?.capabilities?.supportsThinking || false,
    configComponent: ThinkingModeToggle
  },
  {
    id: 'fileUpload',
    isSupported: (provider) => 
      PROVIDER_CONFIGS[provider]?.capabilities?.supportsFileUpload || false,
    configComponent: FileUploadConfig
  }
  // Add more capabilities without changing existing code
];