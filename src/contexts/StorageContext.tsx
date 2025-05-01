import React, { createContext, useContext, ReactNode, useRef } from 'react';
import { StorageService } from '@src/services/StorageService';

// Constants
const STORAGE_CONFIG = {
  maxStorageSize: 10 * 1024 * 1024, // 10MB
  warningThreshold: 0.85 // 85%
} as const;

interface StorageContextType {
  storageService: StorageService;
}

const StorageContext = createContext<StorageContextType | null>(null);

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};

interface StorageProviderProps {
  children: ReactNode;
}

export const StorageProvider: React.FC<StorageProviderProps> = ({ children }) => {
  const storageServiceRef = useRef(new StorageService(STORAGE_CONFIG));
  
  const value = {
    storageService: storageServiceRef.current
  };
  
  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
};