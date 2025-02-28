import useStore from '@store/store';

/**
 * Calculates size of a string in bytes
 */
const getStringSizeInBytes = (str: string): number => {
  return new TextEncoder().encode(str).length;
};

/**
 * More accurate calculation of localStorage size
 */
const getLocalStorageSize = (): number => {
  let size = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const item = localStorage[key];
      size += getStringSizeInBytes(key) + getStringSizeInBytes(item);
    }
  }
  return size;
};

/**
 * Converts bytes to MB
 */
const bytesToMB = (bytes: number): number => {
  return bytes / (1024 * 1024);
};

/**
 * Checks localStorage quota and sets error if storage is nearly full
 */
export const checkStorageQuota = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const totalSize = getLocalStorageSize();
      const totalSizeMB = bytesToMB(totalSize);

      // localStorage limit is typically 5MB-10MB depending on the browser
      const maxSize = 5; // 5MB as a safe limit
      const warningThreshold = maxSize * 0.9; // 90% of maxSize (4.5MB)

      console.log(`Current localStorage size: ${totalSizeMB.toFixed(2)}MB`);

      if (totalSizeMB > warningThreshold) {
        useStore.getState().setError(
          `Local storage is almost full (${totalSizeMB.toFixed(2)}MB / ${maxSize}MB). ` +
          `Please delete some chats to continue saving new messages.`
        );
        resolve(false);
      } else {
        useStore.getState().setError(''); // Clear any existing error
        resolve(true);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error checking storage';
      console.error('Storage check error:', errorMessage);
      useStore.getState().setError(`Storage error: ${errorMessage}`);
      resolve(false);
    }
  });
};