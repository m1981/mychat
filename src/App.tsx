import React from 'react';

import Chat from '@components/Chat';
import Debug from '@components/Debug';
import Menu from '@components/Menu';
import Debug from '@components/Debug';
import useInitialiseNewChat from '@hooks/useInitialiseNewChat';
import * as Sentry from '@sentry/react';
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';
import { Theme } from '@type/theme';
import { getEnvVar } from '@utils/env';
import { Toaster } from 'react-hot-toast';
import { ProviderProvider } from '@contexts/ProviderContext';
import { withErrorHandling, useSafeEffect } from '@utils/errorHandling';

import i18n from './i18n';

// Initialize Sentry with better production configuration
const release = `v${getEnvVar('npm_package_version', '1.0.0')}`;
const nodeEnv = getEnvVar('NODE_ENV', 'development');

Sentry.init({
  dsn: "https://b246997c418bfddd2af1194a62c39fe1@o4506736184721408.ingest.us.sentry.io/4509238037446656",
  environment: nodeEnv,
  enabled: nodeEnv === 'production',
  debug: nodeEnv !== 'production',

  // Release tracking - important for source maps
  release,

  // Modern integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    // Optional: Add Session Replay if you need it
    // Sentry.replayIntegration(),
  ],

  // Performance monitoring
  tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/mychat-silk\.vercel\.app/
  ],

  // Privacy and security
  sendDefaultPii: true,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
    }
    // Add relevant app state
    const state = useStore.getState();
    event.extra = {
      ...event.extra,
      currentChatIndex: state.currentChatIndex,
      chatCount: state.chats?.length
    };
    return event;
  },

  // Optional: Session Replay configuration
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,

  // Optional: Configure error boundaries
});

// Optional: Add global tags
Sentry.setTags({
  'app.version': getEnvVar('VITE_APP_VERSION', ''),
  'app.environment': nodeEnv,
});

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void; // Renamed to _resetError to match unused var pattern
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({error, resetError: _resetError}) => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center p-6 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Oops! Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </button>
    </div>
  </div>
);

function App() {
  const initialiseNewChat = useInitialiseNewChat();
  const addChat = useStore((state) => state.addChat);
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);
  const setTheme = useStore((state) => state.setTheme);
  const setApiKey = useStore((state) => state.setApiKey);
  const providerKey = useStore(state => state.currentProvider);
  const setError = useStore(state => state.setError);
  const chats = useStore(state => state.chats);
  const currentChatIndex = useStore(state => state.currentChatIndex);

  // Use the safe effect utility
  useSafeEffect(() => {
    Sentry.startSpan({ name: "app-initialization" }, (span) => {
      document.documentElement.lang = i18n.language;
      i18n.on('languageChanged', (lng) => {
        document.documentElement.lang = lng;
      });
      span.end();
    });
  }, [], { component: 'App', operation: 'i18n-setup' });

  // Use the safe effect utility for localStorage operations
  useSafeEffect(() => {
    const oldChats = localStorage.getItem('chats');
    const apiKey = localStorage.getItem('apiKey');
    const theme = localStorage.getItem('theme');

    if (apiKey) {
      setApiKey('openai', apiKey);
      localStorage.removeItem('apiKey');
    }

    if (theme) {
      setTheme(theme as Theme);
      localStorage.removeItem('theme');
    }

    if (oldChats) {
      try {
        const chats: ChatInterface[] = JSON.parse(oldChats);
        if (chats.length > 0) {
          // Use the store's actions to update state
          chats.forEach(chat => addChat(chat));
          setCurrentChatIndex(0);
        } else {
          initialiseNewChat();
        }
      } catch (e) {
        Sentry.captureException(e);
        initialiseNewChat();
      }
      localStorage.removeItem('chats');
    } else {
      // Check if we need to initialize a new chat
      if (!chats || chats.length === 0) {
        initialiseNewChat();
      }
      // Make sure we have a valid current chat index
      if (chats && chats.length > 0 && 
          !(currentChatIndex >= 0 && currentChatIndex < chats.length)) {
        setCurrentChatIndex(0);
      }
    }
  }, [], { component: 'App', operation: 'load-saved-state' });

  // Wrap error-generating functions
  const handleErrorClick = () => {
    withErrorHandling(
      async () => {
        throw new Error("This is your first error 4!");
      },
      { errorType: 'test_error', component: 'App' }
    ).catch(error => {
      // Handle at component level if needed
      setError(error.message);
    });
  };

  // Use a variable for the test button visibility
  const showTestButton = true;

  return (
    <ProviderProvider providerKey={providerKey || 'openai'}>
      <Sentry.ErrorBoundary 
        fallback={({ error, resetError }) => (
          <ErrorFallback 
            error={error as Error}
            resetError={resetError} 
          />
        )}
        onError={(error, info) => {
          Sentry.withScope((scope) => {
            scope.setExtra("componentStack", info);
            Sentry.captureException(error);
          });
          console.error("Error caught by boundary:", error);
        }}
      >
        <div className='overflow-hidden w-full h-full relative'>
          <Menu />
          <Chat />
          <Toaster />
        {process.env.NODE_ENV === 'development' && <Debug />}
          {showTestButton && (
            <>
              <Debug />
              <button 
                className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded"
                onClick={handleErrorClick}
              >
                Test Sentry
              </button>
            </>
          )}
        </div>
      </Sentry.ErrorBoundary>
    </ProviderProvider>
  );
}

export default App;
