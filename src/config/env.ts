// src/config/env.ts

// In Next.js, process.env.NODE_ENV is replaced at build time
// with 'development', 'production', or 'test'
// We need to check if we're in a browser environment first
const isDev = typeof window !== 'undefined' 
  ? process.env.NODE_ENV !== 'production' 
  : process.env.NODE_ENV === 'development';

export const ENV = {
  // Automatically use mock API in development mode
  IS_DEV: isDev,
  
  // Mock API configuration
  MOCK_API: {
    // Only use mock in development when explicitly enabled
    ENABLED: isDev,
    DELAY_MS: '200',
    MESSAGES: '50',
  }
};