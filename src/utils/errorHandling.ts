import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * Wraps an async function with standardized error handling
 * @param fn The async function to wrap
 * @param context Additional context to include with errors
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: Record<string, any> = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    Sentry.withScope((scope) => {
      // Add context to the error
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      
      // Capture the exception
      Sentry.captureException(error);
    });
    
    // Re-throw to allow component-level handling
    throw error;
  }
}

/**
 * Creates a wrapped version of useEffect for error handling
 * @param effect The effect function
 * @param deps The dependency array
 * @param context Additional context to include with errors
 */
export function useSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  context: Record<string, any> = {}
): void {
  React.useEffect(() => {
    try {
      return effect();
    } catch (error) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      });
      console.error('Error in effect:', error);
    }
  }, deps);
}