import { useReducer } from 'react';

// Define all possible states
export type SubmissionStatus = 
  | 'idle'
  | 'preparing'
  | 'submitting' 
  | 'streaming'
  | 'completing'
  | 'success'
  | 'error';

// State structure
export interface SubmissionState {
  status: SubmissionStatus;
  error: Error | null;
  aborted: boolean;
}

// All possible actions
type SubmissionAction = 
  | { type: 'SUBMIT_START' }
  | { type: 'PREPARING' }
  | { type: 'SUBMITTING' }
  | { type: 'STREAMING' }
  | { type: 'CONTENT_RECEIVED' }
  | { type: 'STREAM_COMPLETE' }
  | { type: 'GENERATING_TITLE' }
  | { type: 'COMPLETE' }
  | { type: 'ABORT' }
  | { type: 'ERROR', payload: Error };

// Initial state
const initialState: SubmissionState = {
  status: 'idle',
  error: null,
  aborted: false
};

// Reducer function
function submissionReducer(state: SubmissionState, action: SubmissionAction): SubmissionState {
  switch (action.type) {
    case 'SUBMIT_START':
      return { ...state, status: 'preparing', error: null, aborted: false };
    case 'PREPARING':
      return { ...state, status: 'preparing' };
    case 'SUBMITTING':
      return { ...state, status: 'submitting' };
    case 'STREAMING':
      return { ...state, status: 'streaming' };
    case 'CONTENT_RECEIVED':
      return { ...state, status: 'streaming' };
    case 'STREAM_COMPLETE':
      return { ...state, status: 'completing' };
    case 'GENERATING_TITLE':
      return { ...state, status: 'completing' };
    case 'COMPLETE':
      return { ...state, status: 'success' };
    case 'ABORT':
      return { ...state, status: 'idle', aborted: true };
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload };
    default:
      return state;
  }
}

export function useSubmissionState() {
  const [state, dispatch] = useReducer(submissionReducer, initialState);
  
  return {
    state,
    dispatch,
    isIdle: state.status === 'idle',
    isSubmitting: ['preparing', 'submitting', 'streaming', 'completing'].includes(state.status),
    isError: state.status === 'error',
    error: state.error
  };
}