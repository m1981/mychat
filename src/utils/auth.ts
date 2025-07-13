import { getEnvVar } from './env';

/**
 * Get the API key for a specific provider
 * @param provider The provider name ('openai' or 'anthropic')
 * @returns The API key or empty string if not found
 */
export function getApiKey(provider: string): string {
  const envVarName = `VITE_${provider.toUpperCase()}_API_KEY`;
  return getEnvVar(envVarName, '');
}

/**
 * Check if an API key is available for a provider
 * @param provider The provider name
 * @returns True if an API key is available
 */
export function hasApiKey(provider: string): boolean {
  return getApiKey(provider).length > 0;
}

/**
 * Get the default API endpoint for a provider
 * @param provider The provider name
 * @returns The default API endpoint
 */
export function getDefaultEndpoint(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    default:
      return '';
  }
}

/**
 * Get the custom API endpoint from environment variables
 * @returns The custom API endpoint or empty string
 */
export function getCustomEndpoint(): string {
  return getEnvVar('VITE_CUSTOM_API_ENDPOINT', '');
}