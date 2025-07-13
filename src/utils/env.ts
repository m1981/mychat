/**
 * Get an environment variable with a fallback value
 * @param name The name of the environment variable
 * @param fallback The fallback value if the variable is not defined
 * @returns The value of the environment variable or the fallback
 */
export function getEnvVar(name: string, fallback: string = ''): string {
  // For Vite-injected environment variables
  if (typeof import.meta.env !== 'undefined') {
    const value = (import.meta.env as Record<string, string>)[name];
    if (value !== undefined) {
      return value;
    }
  }
  
  // For Node.js environment variables
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[name];
    if (value !== undefined) {
      return value;
    }
  }
  
  return fallback;
}

/**
 * Check if we're running in development mode
 * @returns True if in development mode
 */
export function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'development';
}

/**
 * Check if we're running in production mode
 * @returns True if in production mode
 */
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'production';
}

/**
 * Check if we're running in test mode
 * @returns True if in test mode
 */
export function isTest(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'test';
}
