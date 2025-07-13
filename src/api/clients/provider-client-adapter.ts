import { FormattedRequest, ProviderResponse } from '../../types/provider';

/**
 * Interface for provider client adapters
 * Defines the contract that all provider adapters must implement
 */
export interface ProviderClientAdapter {
  /**
   * Create a completion with streaming
   * @param formattedRequest The formatted request
   * @returns A stream of response chunks
   */
  createStreamingCompletion(formattedRequest: FormattedRequest): Promise<any>;
  
  /**
   * Create a completion without streaming
   * @param formattedRequest The formatted request
   * @returns The completion response
   */
  createCompletion(formattedRequest: FormattedRequest): Promise<ProviderResponse>;
}