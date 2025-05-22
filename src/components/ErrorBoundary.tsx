import React from 'react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  componentName?: string;
}

/**
 * Default fallback UI for error states
 */
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({
  error,
  resetError,
}) => (
  <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
    <div className="text-center">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <div className="flex space-x-2 justify-center">
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={resetError}
        >
          Try Again
        </button>
        <button
          className="bg-gray-500 text-white px-3 py-1 rounded"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
);

/**
 * Consistent error boundary component with Sentry integration
 */
export const AppErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  componentName = 'unknown',
}) => {
  const FallbackComponent = fallback || DefaultErrorFallback;

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <FallbackComponent error={error as Error} resetError={resetError} />
      )}
      onError={(error, info) => {
        Sentry.withScope((scope) => {
          scope.setTag('component', componentName);
          scope.setExtra('componentStack', info);
          scope.setLevel(Sentry.Severity.Error);
          Sentry.captureException(error);
        });
        console.error(`Error in ${componentName}:`, error);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};