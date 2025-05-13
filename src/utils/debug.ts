import { LogModule, LogLevel, getLogConfig } from '@config/logging';

class Debug {
  private static instance: Debug;
  private config = getLogConfig();
  
  private constructor() {
    this.updateConfig();
    window.addEventListener('storage', () => this.updateConfig());
  }

  private updateConfig(): void {
    this.config = getLogConfig();
  }

  public getActiveModules(): LogModule[] {
    return this.config.modules;
  }

  public setActiveModules(modules: LogModule[]): void {
    this.config.modules = modules;
    // Optionally persist to localStorage
    localStorage.setItem('debug_modules', modules.join(','));
    this.updateConfig();
  }

  public isDebugEnabled(): boolean {
    return this.config.enabled;
  }

  public toggle(): void {
    const newState = !this.config.enabled;
    localStorage.setItem('app_debug_enabled', String(newState));
    this.updateConfig();
  }

  private shouldLog(module: LogModule, level: LogLevel): boolean {
    const shouldLog = this.config.enabled && 
                     this.config.modules.includes(module) &&
                     this.getLevelValue(level) <= this.getLevelValue(this.config.level);
    return shouldLog;
  }

  private getLevelValue(level: LogLevel): number {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    return levels[level];
  }

  public log(module: LogModule, ...args: any[]): void {
    if (this.shouldLog(module, 'info')) {
      console.log(`[${module}]`, ...args);
    }
  }

  public debug(module: LogModule, ...args: any[]): void {
    if (this.shouldLog(module, 'debug')) {
      console.debug(`[${module}]`, ...args);
    }
  }

  public error(module: LogModule, ...args: any[]): void {
    if (this.shouldLog(module, 'error')) {
      console.error(`[${module}]`, ...args);
    }
  }

  public static getInstance(): Debug {
    if (!Debug.instance) {
      Debug.instance = new Debug();
    }
    return Debug.instance;
  }
}

export const debug = Debug.getInstance();