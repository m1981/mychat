export class ProviderNotFoundError extends Error {
  constructor(provider: string) {
    super(`Provider ${provider} not found`);
    this.name = 'ProviderNotFoundError';
  }
}

export class ModelNotFoundError extends Error {
  constructor(model: string, provider: string) {
    super(`Model ${model} not found for provider ${provider}`);
    this.name = 'ModelNotFoundError';
  }
}