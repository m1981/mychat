export type LogModule = 'store' | 'api' | 'chat' | 'ui' | 'perf';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

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
          m.length > 0 && ['store', 'api', 'chat', 'ui', 'perf'].includes(m)) as LogModule[])
      : ((import.meta.env.VITE_LOG_MODULES || 'store,api')
          .split(',')
          .filter((m: string) => 
            m.length > 0 && ['store', 'api', 'chat', 'ui', 'perf'].includes(m)) as LogModule[])
  };

  return config;
};