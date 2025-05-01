import { useEffect } from 'react';
import useStore from '@store/store';

// Global submission manager reference
import { globalSubmissionManager } from './useSubmit';

export function useComponentUnmountEffect() {
  const { isRequesting, stopRequest } = useStore();
  
  // Component unmount effect - ensure we clean up any active requests
  useEffect(() => {
    return () => {
      // Only abort if we're not in a global submission
      if (isRequesting && !globalSubmissionManager.isSubmitting) {
        console.log('🧹 Component unmounting, stopping active request');
        stopRequest('Component unmounted');
      } else if (globalSubmissionManager.isSubmitting) {
        console.log('⚠️ Component unmounting during global submission - not aborting');
      }
    };
  }, [isRequesting, stopRequest]);
}