import { StoreSlice } from './store';

export interface RequestSlice {
  // Request state
  isRequesting: boolean;
  abortController: AbortController | null;
  
  // Actions
  startRequest: () => AbortController;
  stopRequest: (reason?: string) => void;
  resetRequestState: () => void;
}

export const createRequestSlice: StoreSlice<RequestSlice> = (set, get) => ({
  // Initial state
  isRequesting: false,
  abortController: null,
  
  // Start a new request, aborting any existing one
  startRequest: () => {
    const { abortController, isRequesting } = get();
    
    // Abort existing request if any
    if (isRequesting && abortController) {
      abortController.abort('New request started');
    }
    
    // Create new controller
    const newController = new AbortController();
    
    // Update state
    set({
      isRequesting: true,
      abortController: newController
    });
    
    return newController;
  },
  
  // Stop the current request
  stopRequest: (reason = 'User stopped request') => {
    const { abortController, isRequesting } = get();
    
    if (isRequesting && abortController) {
      abortController.abort(reason);
    }
    
    set({
      isRequesting: false
    });
  },
  
  // Reset request state (e.g., after completion)
  resetRequestState: () => {
    set({
      isRequesting: false,
      abortController: null
    });
  }
});