import { DEFAULT_SYSTEM_MESSAGE } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import { ChatConfig, ProviderKey } from '@type/chat';
import { Theme } from '@type/theme';

import { StoreSlice } from './store';

export type LayoutWidth = 'normal' | 'wide';

export interface ConfigSlice {
  openConfig: boolean;
  theme: Theme;
  autoTitle: boolean;
  hideMenuOptions: boolean;
  defaultChatConfig: ChatConfig;
  defaultSystemMessage: string;
  hideSideMenu: boolean;
  enterToSubmit: boolean;
  layoutWidth: LayoutWidth;
  setOpenConfig: (openConfig: boolean) => void;
  setTheme: (theme: Theme) => void;
  setAutoTitle: (autoTitle: boolean) => void;
  setProvider: (provider: ProviderKey) => void;
  setDefaultChatConfig: (config: ChatConfig) => void;
  setDefaultSystemMessage: (defaultSystemMessage: string) => void;
  setHideMenuOptions: (hideMenuOptions: boolean) => void;
  setHideSideMenu: (hideSideMenu: boolean) => void;
  setEnterToSubmit: (enterToSubmit: boolean) => void;
  setLayoutWidth: (width: LayoutWidth) => void;

}

export const createConfigSlice: StoreSlice<ConfigSlice> = (set) => ({
  openConfig: false,
  theme: 'dark',
  hideMenuOptions: false,
  hideSideMenu: false,
  autoTitle: false,
  enterToSubmit: true,
  layoutWidth: 'normal',
  defaultChatConfig: {
    provider: 'anthropic',
    modelConfig: DEFAULT_MODEL_CONFIG,
  },
  defaultSystemMessage: DEFAULT_SYSTEM_MESSAGE,
  setOpenConfig: (openConfig: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      openConfig: openConfig,
    }));
  },
  setTheme: (theme: Theme) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      theme: theme,
    }));
  },
  setAutoTitle: (autoTitle: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      autoTitle: autoTitle,
    }));
  },
  setDefaultChatConfig: (config: ChatConfig) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      defaultChatConfig: config,
    }));
  },
  setProvider: (provider: ProviderKey) => {
    set((prev) => ({
      ...prev,
      defaultChatConfig: {
        ...prev.defaultChatConfig,
        provider,
      },
    }));
  },
  setDefaultSystemMessage: (defaultSystemMessage: string) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      defaultSystemMessage: defaultSystemMessage,
    }));
  },
  setHideMenuOptions: (hideMenuOptions: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      hideMenuOptions: hideMenuOptions,
    }));
  },
  setHideSideMenu: (hideSideMenu: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      hideSideMenu: hideSideMenu,
    }));
  },
  setEnterToSubmit: (enterToSubmit: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      enterToSubmit: enterToSubmit,
    }));
  },
  setLayoutWidth: (layoutWidth: LayoutWidth) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      layoutWidth,
    }));
  },
});
