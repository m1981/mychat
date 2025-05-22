import { CapabilityDefinition } from '@type/capability';
import { 
  MaxTokenSlider,
  TemperatureSlider,
  TopPSlider,
  PresencePenaltySlider,
  FrequencyPenaltySlider
} from '@components/ConfigMenu/ConfigMenu';
import { capabilityRegistry } from './registry';

// Temperature capability
export const TemperatureCapability: CapabilityDefinition = {
  id: 'temperature',
  name: 'Temperature',
  priority: 1000, // Very high priority to appear at top
  isSupported: () => true, // Supported by all providers
  configComponent: TemperatureSlider
};

// Top-P capability
export const TopPCapability: CapabilityDefinition = {
  id: 'top_p',
  name: 'Top P',
  priority: 900,
  isSupported: () => true,
  configComponent: TopPSlider
};

// Max Tokens capability
export const MaxTokensCapability: CapabilityDefinition = {
  id: 'max_tokens',
  name: 'Max Tokens',
  priority: 800,
  isSupported: () => true,
  configComponent: MaxTokenSlider
};

// Presence Penalty capability
export const PresencePenaltyCapability: CapabilityDefinition = {
  id: 'presence_penalty',
  name: 'Presence Penalty',
  priority: 700,
  isSupported: (provider) => provider === 'openai', // Only OpenAI supports this
  configComponent: PresencePenaltySlider
};

// Frequency Penalty capability
export const FrequencyPenaltyCapability: CapabilityDefinition = {
  id: 'frequency_penalty',
  name: 'Frequency Penalty',
  priority: 600,
  isSupported: (provider) => provider === 'openai', // Only OpenAI supports this
  configComponent: FrequencyPenaltySlider
};

// Register all standard capabilities
capabilityRegistry.registerCapability(TemperatureCapability);
capabilityRegistry.registerCapability(TopPCapability);
capabilityRegistry.registerCapability(MaxTokensCapability);
capabilityRegistry.registerCapability(PresencePenaltyCapability);
capabilityRegistry.registerCapability(FrequencyPenaltyCapability);