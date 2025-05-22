/**
 * Standardized error response format
 */
export interface ErrorResponse {
  /**
   * Error message
   */
  error: string;
  
  /**
   * HTTP status code
   */
  status: number;
  
  /**
   * Error type for categorization
   */
  type?: string;
  
  /**
   * Additional error details
   */
  details?: string;
}