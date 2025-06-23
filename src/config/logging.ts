// Define modules in a single place
export const LOG_MODULES = [
  'store',
  'api', 
  'chat', 
  'ui', 
  'perf', 
  'useSubmit', 
  'scrollToEdit',
  'focus',
  'streaming',
  'model'
] as const;

export type LogModule = typeof LOG_MODULES[number];
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Add a constant object for module names to prevent typos
export const DEBUG_MODULE: Record<Uppercase<LogModule>, LogModule> = {
  STORE: 'store',
  API: 'api',
  CHAT: 'chat',
  UI: 'ui',
  PERF: 'perf',
  USESUBMIT: 'useSubmit',
  SCROLLTOEDIT: 'scrollToEdit',
  FOCUS: 'focus',
  STREAMING: 'streaming',
  MODEL: 'model'
} as const;

export interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  modules: LogModule[];
}

export const getLogConfig = (): LogConfig => {
  const storedModules = localStorage.getItem('debug_modules');
  
  const config = {
    enabled: import.meta.env.DEV || localStorage.getItem('app_debug_enabled') === 'true',
    level: (import.meta.env.VITE_LOG_LEVEL || 'info') as LogLevel,
    modules: storedModules
      ? (storedModules.split(',').filter((m: string) => 
          m.length > 0 && LOG_MODULES.includes(m as LogModule)) as LogModule[])
      : ((import.meta.env.VITE_LOG_MODULES || 'store,api')
          .split(',')
          .filter((m: string) => 
            m.length > 0 && LOG_MODULES.includes(m as LogModule)) as LogModule[])
  };

  return config;
};