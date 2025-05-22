// Import all capabilities to register them
import './standard-config.capability'; // Import standard capabilities first
import './thinking-mode.capability';
// Import other capabilities as they're implemented

// Export the registry for use in components
export { capabilityRegistry, createCapabilityContext } from './registry';

/**
 * Initialize all capabilities
 * This function should be called during app initialization
 */
export function initializeCapabilities(): void {
  // All capabilities are registered when imported above
  console.log('Capability registry initialized');
}