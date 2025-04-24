/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_DEFAULT_API_ENDPOINT: string
  readonly VITE_DEFAULT_SYSTEM_MESSAGE: string
  readonly VITE_SIM_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Ensure TypeScript knows about import.meta.env
declare module 'vite/client' {
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
