# Async Programming Principles

## Core Principles with Motivations

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

### 2. Explicit Error Boundaries
**Motivation**: Clear error handling strategies prevent error swallowing and make debugging easier. Different types of errors often require different handling strategies.
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
```

### 3. Promise Chain Flattening
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

### 4. Cancellation Tokens
**Motivation**: Proper cancellation prevents resource leaks and allows graceful shutdown of long-running operations.
```typescript
class AsyncOperation {
  constructor(private abortSignal: AbortSignal) {}

  async execute() {
    if (this.abortSignal.aborted) return;
    
    this.abortSignal.addEventListener('abort', () => {
      // Cleanup resources
    });
  }
}
```

### 5. Resource Cleanup Guarantees
**Motivation**: Ensuring resources are always cleaned up prevents memory leaks and other resource exhaustion issues.
```typescript
async function withResource<T>(
  acquire: () => Promise<T>,
  use: (resource: T) => Promise<void>,
  release: (resource: T) => Promise<void>
) {
  const resource = await acquire();
  try {
    await use(resource);
  } finally {
    await release(resource);
  }
}
```

### 6. State Machine Pattern
**Motivation**: Clear state transitions make async operations more predictable and easier to debug.
```typescript
enum AsyncState {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR
}

class AsyncOperation {
  private state: AsyncState = AsyncState.IDLE;
  
  async execute() {
    this.state = AsyncState.LOADING;
    try {
      await this.doWork();
      this.state = AsyncState.SUCCESS;
    } catch {
      this.state = AsyncState.ERROR;
    }
  }
}
```

### 7. Timeout Management
**Motivation**: Preventing infinite waits and managing timeouts properly improves system reliability.
```typescript
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  
  return Promise.race([operation, timeout]);
}
```

### 8. Retry Pattern
**Motivation**: Automatic retries can help handle transient failures and improve system resilience.
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  delayMs: number
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}
```

### 9. Circuit Breaker
**Motivation**: Preventing cascade failures and allowing systems to fail fast when necessary.
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure: number = 0;
  
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
}
```

### 10. Dependency Injection for Async Services
**Motivation**: Loose coupling makes testing easier and allows for better separation of concerns.
```typescript
interface AsyncService {
  execute(): Promise<void>;
}

class Operation {
  constructor(
    private service: AsyncService,
    private logger: Logger
  ) {}
  
  async run() {
    await this.service.execute();
  }
}
```

### 11. Observable Progress
**Motivation**: Providing feedback for long-running operations improves user experience.
```typescript
interface Progress {
  completed: number;
  total: number;
  status: 'running' | 'complete' | 'error';
}

async function longOperation(
  onProgress: (progress: Progress) => void
) {
  let completed = 0;
  const total = 100;
  
  while (completed < total) {
    await doWork();
    completed++;
    onProgress({ completed, total, status: 'running' });
  }
}
```

### 12. Batch Processing
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
```

### 13. Async Iterator Pattern
**Motivation**: Processing large datasets efficiently without loading everything into memory.
```typescript
async function* generateItems() {
  let page = 1;
  while (true) {
    const items = await fetchPage(page);
    if (items.length === 0) break;
    yield* items;
    page++;
  }
}
```

### 14. Concurrent Control
**Motivation**: Managing system resources by limiting concurrent operations.
```typescript
class ConcurrencyLimiter {
  private running = 0;
  
  constructor(private maxConcurrent: number) {}
  
  async execute<T>(task: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
    }
  }
}
```

### 15. Event Aggregation
**Motivation**: Reducing system load by processing events in batches.
```typescript
class EventAggregator {
  private events: Event[] = [];
  private timeoutId?: NodeJS.Timeout;
  
  addEvent(event: Event) {
    this.events.push(event);
    this.scheduleProcessing();
  }
  
  private scheduleProcessing() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.processEvents(), 1000);
  }
}
```

### 16. Async Lock
**Motivation**: Preventing race conditions in async operations.
```typescript
class AsyncLock {
  private locked = false;
  private queue: (() => void)[] = [];
  
  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    
    return new Promise(resolve => this.queue.push(resolve));
  }
  
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}
```

### 17. Async Cache
**Motivation**: Improving performance by caching async operation results.
```typescript
class AsyncCache<K, V> {
  private cache = new Map<K, Promise<V>>();
  
  async get(key: K, factory: () => Promise<V>): Promise<V> {
    if (!this.cache.has(key)) {
      this.cache.set(key, factory());
    }
    return this.cache.get(key)!;
  }
}
```

### 18. Async Initialization
**Motivation**: Ensuring proper initialization before usage while maintaining async nature.
```typescript
class AsyncService {
  private initPromise: Promise<void>;
  
  constructor() {
    this.initPromise = this.initialize();
  }
  
  private async initialize() {
    // Initialization logic
  }
  
  async execute() {
    await this.initPromise;
    // Service logic
  }
}
```

### 19. Async Cleanup
**Motivation**: Ensuring proper resource cleanup in async contexts.
```typescript
class CleanupManager {
  private cleanupTasks: (() => Promise<void>)[] = [];
  
  register(task: () => Promise<void>) {
    this.cleanupTasks.push(task);
  }
  
  async cleanup() {
    await Promise.all(this.cleanupTasks.map(task => task()));
    this.cleanupTasks = [];
  }
}
```

### 20. Async Context
**Motivation**: Managing context across async operations.
```typescript
class AsyncContext<T> {
  private context?: T;
  
  async run<R>(context: T, operation: () => Promise<R>): Promise<R> {
    const previousContext = this.context;
    this.context = context;
    
    try {
      return await operation();
    } finally {
      this.context = previousContext;
    }
  }
}
```

## Summary Benefits

These principles collectively provide:
- More maintainable async code
- Better error handling
- Cleaner resource management
- More testable code
- Better concurrency control
- More predictable behavior

Each principle addresses specific challenges in async programming and can be combined as needed for your specific use case.


# Functional Programming Principles

## Core Principles with Motivations

### 1. Pure Functions
**Motivation**: Pure functions make code predictable, testable, and easier to reason about by ensuring the same input always produces the same output without side effects.
```typescript
// Bad - Impure function with side effects
let total = 0;
function addToTotal(value: number): number {
  total += value; // Side effect: modifying external state
  return total;
}

// Good - Pure function
function add(a: number, b: number): number {
  return a + b; // No side effects, same input always gives same output
}

// Good - Pure function with complex logic
function calculateTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}
```

### 2. Immutability
**Motivation**: Immutable data prevents bugs from unexpected state changes and makes code behavior more predictable, especially in async operations.
```typescript
// Bad - Mutable state
interface User {
  name: string;
  preferences: {
    theme: string;
    notifications: boolean;
  };
}

function updateUserTheme(user: User, theme: string) {
  user.preferences.theme = theme; // Direct mutation
  return user;
}

// Good - Immutable updates
interface ImmutableUser {
  readonly name: string;
  readonly preferences: {
    readonly theme: string;
    readonly notifications: boolean;
  };
}

function updateUserTheme(user: ImmutableUser, theme: string): ImmutableUser {
  return {
    ...user,
    preferences: {
      ...user.preferences,
      theme,
    }
  };
}

// Good - Using immutable collections
import { Map } from 'immutable';

const userPreferences = Map({
  theme: 'light',
  notifications: true
});

const updatedPreferences = userPreferences.set('theme', 'dark');
```

### 3. Combining Pure Functions with Async Operations
**Motivation**: Maintaining functional principles in async code improves predictability and testing.
```typescript
// Bad - Mixing concerns and side effects
async function processUserData(userId: string) {
  const user = await fetchUser(userId);
  user.lastLogin = new Date(); // Side effect
  const processed = someComplexCalculation(user);
  await saveUser(user); // Side effect
  return processed;
}

// Good - Separating pure calculations from side effects
interface UserData {
  readonly id: string;
  readonly lastLogin: Date;
  readonly settings: ReadonlyArray<string>;
}

// Pure function for calculations
function processUserData(user: UserData): ProcessedData {
  return {
    ...user,
    settings: user.settings.filter(isValidSetting),
    computed: someComplexCalculation(user)
  };
}

// Async wrapper handling side effects
async function updateUser(userId: string): Promise<ProcessedData> {
  const user = await fetchUser(userId);
  const processed = processUserData(user);
  await saveUser(processed);
  return processed;
}
```

### 4. Immutable State Updates in Async Context
**Motivation**: Managing state updates in async operations while maintaining immutability.
```typescript
// Bad - Mutable state in async operations
class DataProcessor {
  private data: any[] = [];
  
  async processItems() {
    const newItems = await fetchItems();
    this.data.push(...newItems); // Mutation
    return this.data;
  }
}

// Good - Immutable state updates
interface ProcessorState {
  readonly data: ReadonlyArray<any>;
  readonly status: 'idle' | 'processing' | 'complete';
}

class ImmutableDataProcessor {
  constructor(private state: ProcessorState) {}
  
  async processItems(): Promise<ProcessorState> {
    const newItems = await fetchItems();
    return {
      ...this.state,
      data: [...this.state.data, ...newItems],
      status: 'complete'
    };
  }
}
```

## Benefits of Functional Principles

Incorporating these functional programming principles provides:
- Improved testability through pure functions
- Better debugging through immutable state
- Reduced bugs from unexpected state mutations
- Easier reasoning about code behavior
- Better support for concurrent operations
- Enhanced type safety with readonly types

These principles complement the async patterns by providing a solid foundation for managing data and state transformations in asynchronous operations.


# Modern Flux Architecture Principles

## Core Principles with Motivations

### 1. Centralized State Management
**Motivation**: Single source of truth prevents state inconsistencies and makes the application more predictable.
```typescript
// Bad - Scattered state
class UserComponent {
  private state = { user: null };
  private settings = { theme: 'light' };
}

// Good - Centralized store
const store = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      settings: { theme: 'light' },
      setUser: (user) => set({ user }),
      setTheme: (theme) => set(state => ({
        settings: { ...state.settings, theme }
      }))
    })
  )
);
```

### 2. State Slice Pattern
**Motivation**: Breaking down state into logical slices improves maintainability and enables better code organization.
```typescript
interface StoreState extends 
  AuthSlice,
  ConfigSlice,
  DataSlice {}

const createAuthSlice: StoreSlice<AuthSlice> = (set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null })
});
```

### 3. Unidirectional Data Flow
**Motivation**: Predictable state updates and easier debugging by enforcing a single direction for data flow.
```typescript
// Bad - Bidirectional data flow
class Component {
  updateState() {
    this.state.data = newData;
    this.parent.updateState(newData);
  }
}

// Good - Unidirectional flow
function Component() {
  const { data, updateData } = useStore();
  
  const handleUpdate = (newData) => {
    updateData(newData); // Single source of update
  };
}
```

### 4. Custom Hooks for Business Logic
**Motivation**: Separating business logic from UI components improves reusability and testing.
```typescript
// Bad - Mixed concerns
function UserComponent() {
  async function handleSubmit() {
    const data = await fetchData();
    processData(data);
    updateUI(data);
  }
}

// Good - Separated concerns
function useUserData() {
  const fetchAndProcess = async () => {
    const data = await fetchData();
    return processData(data);
  };
  return { fetchAndProcess };
}

function UserComponent() {
  const { fetchAndProcess } = useUserData();
}
```

### 5. Immutable State Updates
**Motivation**: Prevents bugs from unexpected state mutations and enables efficient change detection.
```typescript
// Bad - Direct mutation
function updateUser(user) {
  state.user = user;
  state.lastUpdated = Date.now();
}

// Good - Immutable updates
const updateUser = (user) => 
  set(state => ({
    user,
    lastUpdated: Date.now()
  }));
```

### 6. Selective State Subscription
**Motivation**: Optimizes performance by preventing unnecessary re-renders.
```typescript
// Bad - Full store subscription
const { entireStore } = useStore();

// Good - Selective subscription
const user = useStore(state => state.user);
const theme = useStore(state => state.settings.theme);
```

### 7. Middleware Pattern
**Motivation**: Enables cross-cutting concerns like logging, analytics, or error handling.
```typescript
const store = create(
  devtools(
    persist(
      (set, get) => ({
        // store definition
      }),
      {
        name: 'app-storage',
        version: 1
      }
    )
  )
);
```

### 8. Action Creators with TypeScript
**Motivation**: Type-safe state updates and better IDE support.
```typescript
interface Actions {
  updateUser: (user: User) => void;
  updateSettings: (settings: Settings) => void;
}

const createActions = (set: SetState<Store>): Actions => ({
  updateUser: (user) => set({ user }),
  updateSettings: (settings) => set({ settings })
});
```

## Summary Benefits

These principles collectively provide:
- Predictable state management
- Better code organization
- Improved testing capabilities
- Type safety
- Performance optimization
- Better debugging experience
- Cleaner separation of concerns
- Reusable business logic
- Efficient state updates
- Cross-cutting concerns handling

Each principle addresses specific challenges in modern web application development and can be combined as needed for your specific use case.
