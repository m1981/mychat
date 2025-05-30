/**
 * Application Configuration
 * 
 * This file contains environment-specific configuration.
 * Values can be overridden by environment variables.
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// API configuration
export const API_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
  timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10)
};

// Feature flags
export const FEATURES = {
  enableThinking: process.env.ENABLE_THINKING !== 'false',
  debugMode: isDevelopment || process.env.DEBUG_MODE === 'true'
};

// Export environment info
export const ENV = {
  isDevelopment,
  isProduction,
  isTest
};