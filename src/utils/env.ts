export const getEnvVar = (key: keyof ImportMetaEnv, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue;
};