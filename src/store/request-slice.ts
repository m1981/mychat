import { StoreSlice } from './store';

export interface RequestSlice {
  // Request state
  isRequesting: boolean;
  abortController: AbortController | null;
  abortReason: string | null;
  
  // Actions
  startRequest: () => AbortController;
  stopRequest: (reason: string) => void;
  resetRequestState: () => void;
}

export const createRequestSlice: StoreSlice<RequestSlice> = (set, get) => ({
  // Initial state
  isRequesting: false,
  abortController: null,
  abortReason: null,
  
  // Start a new request, aborting any existing one
  startRequest: () => {
    // Create a new abort controller
    const controller = new AbortController();
    
    // Update state
    set({
      isRequesting: true,
      abortController: controller,
      abortReason: null
    });
    
    console.log('🔄 Request started with new AbortController');
    return controller;
  },
  
  // Stop the current request
  stopRequest: (reason: string) => {
    const { abortController, isRequesting } = get();
    
    if (isRequesting && abortController) {
      console.log(`🛑 Aborting request: ${reason}`);
      abortController.abort(reason);
      
      set({
        isRequesting: false,
        abortReason: reason
      });
    } else {
      console.log('⚠️ No active request to abort');
    }
  },
  
  // Reset request state (e.g., after completion)
  resetRequestState: () => {
    console.log('🔄 Resetting request state');
    set({
      isRequesting: false,
      abortController: null,
      abortReason: null
    });
  }
});