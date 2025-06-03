/**
 * Migration Utilities
 * 
 * This module provides utilities to help migrate from the old structure
 * to the new structure.
 */

import { ConfigService } from '../services/ConfigService';
import { 
  ChatInterface, 
  ChatConfig, 
  ModelConfig, 
  ProviderKey 
} from '../types';

/**
 * Migrates an old-format chat to the new format
 */
export function migrateChat(oldChat: any): ChatInterface {
  // Ensure we have a valid chat object
  if (!oldChat || typeof oldChat !== 'object') {
    return ConfigService.createNewChat();
  }

  // Extract provider and model config
  const provider = oldChat.config?.provider || 'anthropic';
  const modelConfig = oldChat.config?.modelConfig || {};

  // Create a valid chat config
  const config: ChatConfig = {
    provider: provider as ProviderKey,
    modelConfig: ConfigService.validateModelConfig(
      modelConfig as ModelConfig, 
      provider as ProviderKey
    )
  };

  // Return a valid chat object
  return {
    id: oldChat.id || '',
    title: oldChat.title || 'Untitled Chat',
    messages: Array.isArray(oldChat.messages) ? oldChat.messages : [],
    config,
    folder: oldChat.folder,
    titleSet: !!oldChat.titleSet,
    timestamp: oldChat.timestamp || Date.now()
  };
}

/**
 * Migrates an array of old-format chats to the new format
 */
export function migrateChats(oldChats: any[]): ChatInterface[] {
  if (!Array.isArray(oldChats)) {
    return [ConfigService.createNewChat()];
  }
  
  return oldChats.map(migrateChat);
}