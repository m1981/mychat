# Async Programming Principles

## Core Patterns (Framework-Agnostic)

### 1. Single Responsibility in Async Operations
**Motivation**: Separating concerns makes async code easier to test, maintain, and debug. Each async function should do one thing and do it well.
```typescript
// Bad
async function processAndSaveData() {
  const data = await fetchData();
  await saveToDatabase(data);
  await notifyUser(data);
}

// Good
async function processData() {
  const data = await fetchData();
  return transformData(data);
}
```

### 2. Promise Chain Flattening
**Motivation**: Flat promise chains are easier to read and maintain than nested ones. They also make error propagation more predictable.
```typescript
// Bad
getData()
  .then(data => {
    return processData(data).then(result => {
      return saveData(result);
    });
  });

// Good
getData()
  .then(processData)
  .then(saveData);
```

### 3. Comprehensive Error Handling
**Motivation**: Clear error handling strategies prevent error swallowing, make debugging easier, and improve system resilience.
```typescript
// Bad
async function riskyOperation() {
  try {
    await doEverything();
  } catch (error) {
    console.error(error);
  }
}

// Good
async function riskyOperation() {
  try {
    await doEverything();
  } catch (error) {
    if (error instanceof NetworkError) {
      await handleNetworkError(error);
    } else if (error instanceof ValidationError) {
      await handleValidationError(error);
    } else {
      throw error; // Let caller handle unknown errors
    }
  }
}

// Advanced: Circuit Breaker Pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailure: number = 0;
  private threshold = 5;
  private resetTimeout = 30000; // 30 seconds
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const now = Date.now();
      if (now - this.lastFailure < this.resetTimeout) {
        return true; // Circuit is open
      }
      // Try to reset after timeout
      this.failures = 0;
    }
    return false;
  }
  
  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }
  
  private reset(): void {
    this.failures = 0;
  }
}
```

### 4. Resource Management
**Motivation**: Proper resource acquisition, usage, and release prevents leaks and ensures efficient resource utilization.
```typescript
// Resource cleanup pattern
async function withResource<T, R>(
  acquire: () => Promise<T>,
  use: (resource: T) => Promise<R>,
  release: (resource: T) => Promise<void>
): Promise<R> {
  const resource = await acquire();
  try {
    return await use(resource);
  } finally {
    await release(resource);
  }
}

// Cancellation pattern
async function withCancellation<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs?: number
): Promise<T> {
  const controller = new AbortController();
  const { signal } = controller;
  
  // Optional timeout
  let timeoutId: NodeJS.Timeout | undefined;
  if (timeoutMs) {
    timeoutId = setTimeout(() => controller.abort(new Error('Timeout')), timeoutMs);
  }
  
  try {
    return await operation(signal);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
```

### 5. Batch Processing
**Motivation**: Processing items in batches can improve performance and reduce resource usage.
```typescript
async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processor(batch);
  }
}

// With concurrency control
async function processBatchWithConcurrency<T, R>(
  items: T[],
  batchSize: number,
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(processor);
    
    // Process in chunks of concurrency
    for (let j = 0; j < batchPromises.length; j += concurrency) {
      const concurrentBatch = batchPromises.slice(j, j + concurrency);
      const batchResults = await Promise.all(concurrentBatch);
      results.push(...batchResults);
    }
  }
  
  return results;
}
```

### 6. Retry Pattern
**Motivation**: Automatic retries can help handle transient failures and improve system resilience.
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number,
    delayMs: number,
    backoff?: boolean,
    shouldRetry?: (error: Error) => boolean
  }
): Promise<T> {
  const { maxAttempts, delayMs, backoff = false, shouldRetry = () => true } = options;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts && shouldRetry(error)) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }
  
  throw lastError;
}
```

### 7. Async Iterator Pattern
**Motivation**: Processing large datasets efficiently without loading everything into memory.
```typescript
async function* generateItems(fetchPage: (page: number) => Promise<any[]>) {
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const items = await fetchPage(page);
    hasMore = items.length > 0;
    
    if (hasMore) {
      yield* items;
      page++;
    }
  }
}

// Usage
async function processLargeDataset() {
  const iterator = generateItems(fetchPageFromAPI);
  
  for await (const item of iterator) {
    await processItem(item);
  }
}
```

## React-Specific Patterns

### 8. Safe Async State Updates
**Motivation**: Preventing memory leaks and race conditions when components unmount during async operations.
```typescript
function useAsyncData<T>(fetchFn: () => Promise<T>, deps: any[] = []) {
  const [state, dispatch] = useReducer(
    (state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> => {
      switch (action.type) {
        case 'LOADING': return { ...state, loading: true, error: null };
        case 'SUCCESS': return { loading: false, data: action.payload, error: null };
        case 'ERROR': return { ...state, loading: false, error: action.payload };
        default: return state;
      }
    },
    { loading: false, data: null, error: null }
  );
  
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    async function fetchData() {
      dispatch({ type: 'LOADING' });
      
      try {
        const data = await fetchFn();
        if (isMounted) {
          dispatch({ type: 'SUCCESS', payload: data });
        }
      } catch (error) {
        if (isMounted && error.name !== 'AbortError') {
          dispatch({ type: 'ERROR', payload: error });
        }
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, deps);
  
  return state;
}

// Usage
function UserProfile({ userId }) {
  const { data: user, loading, error } = useAsyncData(
    () => fetchUser(userId),
    [userId]
  );
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return null;
  
  return <div>{user.name}</div>;
}
```

### 9. Debounced State Updates
**Motivation**: Preventing excessive re-renders and API calls for rapidly changing inputs.
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// Usage
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Only fetch when debouncedSearchTerm changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchSearchResults(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);
  
  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
}
```

### 10. Custom Hook Composition
**Motivation**: Building reusable, testable async logic that can be composed into larger features.
```typescript
// Base hook for data fetching
function useFetch<T>(url: string, options?: RequestInit) {
  return useAsyncData<T>(
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    },
    [url, JSON.stringify(options)]
  );
}

// Domain-specific hook built on top of useFetch
function useUserData(userId: string) {
  const user = useFetch<User>(`/api/users/${userId}`);
  const posts = useFetch<Post[]>(`/api/users/${userId}/posts`);
  
  return {
    user: user.data,
    posts: posts.data,
    loading: user.loading || posts.loading,
    error: user.error || posts.error
  };
}

// Usage
function UserProfile({ userId }) {
  const { user, posts, loading, error } = useUserData(userId);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <PostList posts={posts} />
    </div>
  );
}
```

### 11. Derived State with useMemo
**Motivation**: Avoiding unnecessary recalculations and ensuring consistent derived state.
```typescript
function ProductList({ products, filters }) {
  // Derived state calculated only when dependencies change
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (filters.category && product.category !== filters.category) {
        return false;
      }
      if (filters.minPrice && product.price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice && product.price > filters.maxPrice) {
        return false;
      }
      return true;
    });
  }, [products, filters.category, filters.minPrice, filters.maxPrice]);
  
  return (
    <div>
      {filteredProducts.map(product => (
        <ProductItem key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### 12. State Machines for Complex Async Flows
**Motivation**: Managing complex async workflows with predictable state transitions.
```typescript
import { useMachine } from '@xstate/react';
import { createMachine } from 'xstate';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      invoke: {
        src: 'fetchData',
        onDone: { target: 'success', actions: 'setData' },
        onError: { target: 'failure', actions: 'setError' }
      },
      on: { CANCEL: 'idle' }
    },
    success: {
      on: { FETCH: 'loading', RESET: 'idle' }
    },
    failure: {
      on: { FETCH: 'loading', RESET: 'idle' }
    }
  }
});

function DataComponent() {
  const [state, send] = useMachine(fetchMachine, {
    services: {
      fetchData: (context) => fetchAPI(context.query)
    },
    actions: {
      setData: (context, event) => {
        // Update with immutable pattern
        return { ...context, data: event.data };
      },
      setError: (context, event) => {
        return { ...context, error: event.data };
      }
    }
  });
  
  return (
    <div>
      {state.matches('loading') && <Spinner />}
      {state.matches('success') && <DataView data={state.context.data} />}
      {state.matches('failure') && <ErrorMessage error={state.context.error} />}
      
      <button onClick={() => send('FETCH')}>
        {state.matches('idle') ? 'Load' : 'Reload'}
      </button>
      
      {state.matches('loading') && (
        <button onClick={() => send('CANCEL')}>Cancel</button>
      )}
    </div>
  );
}
```

## Zustand Patterns (Recommended for React Apps)

Zustand provides elegant solutions to many common React state management challenges, particularly for async operations.

### 13. Centralized State with Atomic Updates
**Motivation**: Avoiding prop drilling while maintaining atomic, predictable updates.
```typescript
// Create store with async actions
const useStore = create((set) => ({
  users: [],
  loading: false,
  error: null,
  
  // Async action with proper state transitions
  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/users');
      const users = await response.json();
      set({ users, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));

// Component only subscribes to what it needs
function UserList() {
  // Only re-renders when these specific values change
  const { users, loading, error, fetchUsers } = useStore(
    state => ({
      users: state.users,
      loading: state.loading,
      error: state.error,
      fetchUsers: state.fetchUsers
    })
  );
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <ul>
      {users.map(user => <UserItem key={user.id} user={user} />)}
    </ul>
  );
}
```

### 14. Request State Slice Pattern
**Motivation**: Standardizing async request state management across the application.
```typescript
// Reusable request slice creator
const createRequestSlice = (set, get) => ({
  isRequesting: false,
  abortController: null,
  
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
  
  stopRequest: (reason = 'User stopped request') => {
    const { abortController, isRequesting } = get();
    
    if (isRequesting && abortController) {
      abortController.abort(reason);
    }
    
    set({ isRequesting: false });
  },
  
  resetRequestState: () => {
    set({
      isRequesting: false,
      abortController: null
    });
  }
});

// Combined store with request slice
const useStore = create((set, get) => ({
  data: null,
  error: null,
  ...createRequestSlice(set, get),
  
  fetchData: async () => {
    // Get controller from request slice
    const controller = get().startRequest();
    
    try {
      const response = await fetch('/api/data', {
        signal: controller.signal
      });
      const data = await response.json();
      set({ data });
    } catch (error) {
      if (error.name !== 'AbortError') {
        set({ error: error.message });
      }
    } finally {
      get().resetRequestState();
    }
  }
}));
```

### 15. Composable Slices for Complex Async Workflows
**Motivation**: Breaking down complex state into manageable, reusable pieces.
```typescript
// Define types for store slices
type StoreState = AuthSlice & DataSlice & UISlice;
type StoreSlice<T> = (set: SetState<StoreState>, get: GetState<StoreState>) => T;

// Auth slice with async login/logout
const createAuthSlice: StoreSlice<AuthSlice> = (set, get) => ({
  user: null,
  loginStatus: 'idle',
  
  login: async (credentials) => {
    set({ loginStatus: 'loading' });
    try {
      const user = await authService.login(credentials);
      set({ user, loginStatus: 'success' });
      // Can access other slices via get()
      get().fetchUserData(user.id);
    } catch (error) {
      set({ loginStatus: 'error', error: error.message });
    }
  },
  
  logout: async () => {
    await authService.logout();
    set({ user: null, loginStatus: 'idle' });
    // Reset other slices that depend on auth
    get().resetUserData();
  }
});

// Data slice with async data fetching
const createDataSlice: StoreSlice<DataSlice> = (set, get) => ({
  userData: null,
  dataStatus: 'idle',
  
  fetchUserData: async (userId) => {
    // Only fetch if user is logged in
    if (!get().user) return;
    
    set({ dataStatus: 'loading' });
    try {
      const userData = await dataService.fetchUserData(userId);
      set({ userData, dataStatus: 'success' });
    } catch (error) {