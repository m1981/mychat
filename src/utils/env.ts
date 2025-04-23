export const isDevelopment = process.env.NODE_ENV === 'development';

export const getEnvVar = (key: keyof ImportMetaEnv, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue;
};