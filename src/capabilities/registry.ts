/**
 * Apply middleware with performance optimizations
 */
applyRequestMiddleware(request: FormattedRequest, context: CapabilityContext): FormattedRequest {
  // Create cache key from context
  const cacheKey = `${context.provider}:${context.model}`;
  
  // Get or create middleware chain
  let middlewareChain = this.middlewareCache.get(cacheKey);
  if (!middlewareChain) {
    // Build and cache middleware chain
    middlewareChain = this.getSupportedCapabilities(context.provider, context.model)
      .filter(cap => !!cap.formatRequestMiddleware)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map(cap => cap.formatRequestMiddleware!);
      
    this.middlewareCache.set(cacheKey, middlewareChain);
  }
  
  // Apply middleware chain
  return middlewareChain.reduce(
    (req, middleware) => middleware(req, context),
    request
  );
}