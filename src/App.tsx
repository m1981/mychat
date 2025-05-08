
import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import * as Sentry from '@sentry/react';

import Chat from '@components/Chat';
import Menu from '@components/Menu';
import Debug from '@components/Debug';
import useInitialiseNewChat from '@hooks/useInitialiseNewChat';
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';
import { Theme } from '@type/theme';

import i18n from './i18n';

// Initialize Sentry with better production configuration
Sentry.init({
  dsn: "https://b246997c418bfddd2af1194a62c39fe1@o4506736184721408.ingest.us.sentry.io/4509238037446656",
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production' ? 1 : 1,
  // Use the same release name as in vite.config.prod.ts
  release: process.env.VITE_APP_VERSION || `v${process.env.npm_package_version}`,
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
  // Add debug mode for development
  debug: process.env.NODE_ENV !== 'production' ? 1 : 1,
  // Add integrations that might help with source mapping
  beforeSend(event) {
    // Clean up any sensitive data if needed
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
    }
    return event;
  }
});

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
      Sentry.captureException(error);
        throw error; // Re-throw to trigger the ErrorBoundary
    }
  };

  useEffect(() => {
    try {
    document.documentElement.lang = i18n.language;
    i18n.on('languageChanged', (lng) => {
      document.documentElement.lang = lng;
    });
    } catch (error) {
      Sentry.captureException(error);
    }
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
      // legacy local storage
      setTheme(theme as Theme);
      localStorage.removeItem('theme');
    }

    if (oldChats) {
      // legacy local storage
      try {
        const chats: ChatInterface[] = JSON.parse(oldChats);
        if (chats.length > 0) {
          setChats(chats);
          setCurrentChatIndex(0);
        } else {
          initialiseNewChat();
        }
      } catch (e: unknown) {
          Sentry.captureException(e);
          console.error('Failed to parse chats:', e);
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
      fallback={<ErrorFallback />}
      onError={(error) => {
        Sentry.captureException(error);
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

// Error Fallback Component
const ErrorFallback = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Oops! Something went wrong</h2>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default App;
