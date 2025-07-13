# Provider Migration Guide

## Overview

We've successfully transitioned from direct provider imports to using the `ProviderRegistry` for better maintainability and extensibility. This guide documents the changes made and provides guidance for working with the new approach.

## Why We Changed

- **Improved Testability**: The registry pattern makes it easier to mock providers in tests.
- **Better Extensibility**: New providers can be added without modifying existing code.
- **Dependency Inversion**: Components depend on abstractions rather than concrete implementations.
- **Type Safety**: Better type checking and validation.

## Using the Provider Registry

### Importing the Registry

```typescript
import { ProviderRegistry } from '@config/providers/provider.registry';
```

### Getting a Provider

```typescript
const provider = ProviderRegistry.getProvider(providerKey);
```

### Getting Provider Capabilities

```typescript
const capabilities = ProviderRegistry.getProviderCapabilities(providerKey);
```

### Getting Provider Configuration

```typescript
const config = ProviderRegistry.getProviderConfig(providerKey);
```

### Using the Provider Hook

```typescript
import { useProvider } from '@hooks/useProvider';
const provider = useProvider(providerKey);
```

## Testing with the Provider Registry

When writing tests, mock the ProviderRegistry using our standard mock pattern:

```typescript
import { mockProviderRegistry } from '../../test/mocks/providerRegistryMock';

// Use the standard mock
vi.mock('@config/providers/provider.registry', () => mockProviderRegistry());

// Or customize the mock
vi.mock('@config/providers/provider.registry', () => mockProviderRegistry({
  // Custom provider implementation
  anthropicProvider: {
    id: 'anthropic',
    name: 'Custom Anthropic Mock',
    // ... other properties
  }
}));
```

## Adding a New Provider

To add a new provider to the system:

1. Create a new provider class that implements `AIProviderBase`
2. Add the provider configuration to `provider.config.ts`
3. Register the provider in `ProviderRegistry`

Example:

```typescript
// 1. Create provider class
export class NewProvider implements AIProviderBase {
  id = 'new-provider';
  name = 'New Provider';
  // ... implement required methods
}

// 2. Add to provider.config.ts
export const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  // ... existing providers
  'new-provider': {
    id: 'new-provider',
    name: 'New Provider',
    // ... configuration
  }
};

// 3. Register in ProviderRegistry
// In provider.registry.ts static initializer:
const newProvider = new NewProvider();
ProviderRegistry.providers.set('new-provider', newProvider);
```

## Verification

To verify that your code is using the new pattern correctly, run:

```bash
npm run verify:providers
```

This will check for any remaining references to the old provider pattern.
