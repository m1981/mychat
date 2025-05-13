import React, { useEffect } from 'react';


import Chat from '@components/Chat';
import Menu from '@components/Menu';
import useInitialiseNewChat from '@hooks/useInitialiseNewChat';
import * as Sentry from '@sentry/react'; // Remove duplicate import
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';
import { Theme } from '@type/theme';
import { Toaster } from 'react-hot-toast';

import i18n from './i18n';

// Initialize Sentry with better production configuration
const release = `v${process.env.npm_package_version}`;

Sentry.init({
  dsn: "https://b246997c418bfddd2af1194a62c39fe1@o4506736184721408.ingest.us.sentry.io/4509238037446656",
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV !== 'production',

  // Release tracking - important for source maps
  release,

  // Modern integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    // Optional: Add Session Replay if you need it
    // Sentry.replayIntegration(),
  ],

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
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
  'app.version': process.env.VITE_APP_VERSION,
  'app.environment': process.env.NODE_ENV,
});

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({error, resetError}) => (
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
  const setChats = useStore((state) => state.setChats);
  const setTheme = useStore((state) => state.setTheme);
  const setApiKey = useStore((state) => state.setApiKey);
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);

  const handleErrorClick = () => {
    try {
      throw new Error("This is your first error 4!");
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("error_type", "test_error");
      Sentry.captureException(error);
      });
      throw error;
    }
  };

  useEffect(() => {
    Sentry.startSpan({ name: "app-initialization" }, (span) => {
      try {
        document.documentElement.lang = i18n.language;
        i18n.on('languageChanged', (lng) => {
          document.documentElement.lang = lng;
        });
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        span.end();
      }
    });
  }, []);

  useEffect(() => {
    try {
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
          setChats(chats);
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
      const chats = useStore.getState().chats;
      const currentChatIndex = useStore.getState().currentChatIndex;
      if (!chats || chats.length === 0) {
        initialiseNewChat();
      }
      if (
        chats &&
        !(currentChatIndex >= 0 && currentChatIndex < chats.length)
      ) {
        setCurrentChatIndex(0);
      }
    }
    } catch (error) {
      Sentry.captureException(error);
    }
  }, []);

  return (
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
        {(1) && (
          <button 
            className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded"
            onClick={handleErrorClick}
          >
            Test Sentry
          </button>
        )}
      </div>
    </Sentry.ErrorBoundary>
  );
}

export default App;
