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