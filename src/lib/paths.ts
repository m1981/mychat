import { join } from 'path';

// This ensures correct path resolution in both development and production
export const getRootPath = () => {
  return process.cwd();
};

export const resolveImport = (path: string) => {
  const rootPath = getRootPath();
  return join(rootPath, 'src', path);
};
