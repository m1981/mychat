/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_DEFAULT_API_ENDPOINT: string
  readonly VITE_DEFAULT_SYSTEM_MESSAGE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
