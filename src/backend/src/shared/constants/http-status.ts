/**
 * @fileoverview HTTP status code constants used across all backend microservices.
 * Implements RFC 7231 standard status codes with TypeScript enum for type safety.
 * @version 1.0.0
 * @see https://tools.ietf.org/html/rfc7231#section-6
 */

/**
 * Strongly typed HTTP status codes enum providing consistent response handling
 * across all backend microservices. Values are immutable and aligned with
 * RFC 7231 standards.
 * 
 * Usage:
 * ```typescript
 * import { HttpStatus } from '@shared/constants/http-status';
 * 
 * response.status(HttpStatus.OK).json({ message: 'Success' });
 * ```
 * 
 * @enum {number}
 */
export enum HttpStatus {
  // 2xx Success Codes
  /**
   * Standard response for successful HTTP requests.
   * The actual response will depend on the request method used.
   */
  OK = 200,

  /**
   * Request has been fulfilled and resulted in a new resource being created.
   * Typically used with POST requests.
   */
  CREATED = 201,

  /**
   * Request has been accepted for processing, but processing hasn't been completed.
   * Useful for async operations.
   */
  ACCEPTED = 202,

  /**
   * Server successfully processed the request but is not returning any content.
   * Often used for DELETE operations.
   */
  NO_CONTENT = 204,

  // 4xx Client Error Codes
  /**
   * Request cannot be processed due to client error (e.g., malformed request syntax,
   * invalid request message framing, or deceptive request routing).
   */
  BAD_REQUEST = 400,

  /**
   * Authentication is required and has failed or has not been provided.
   * Must not include credentials in error response.
   */
  UNAUTHORIZED = 401,

  /**
   * Server understood request but refuses to authorize it.
   * Different from 401 as client identity is known.
   */
  FORBIDDEN = 403,

  /**
   * Requested resource could not be found on the server.
   * Do not reveal if resource exists for security purposes.
   */
  NOT_FOUND = 404,

  /**
   * Request method is not supported for the requested resource.
   * Should include Allow header with list of supported methods.
   */
  METHOD_NOT_ALLOWED = 405,

  /**
   * Request conflicts with current state of the server.
   * Typically used for concurrent resource modifications.
   */
  CONFLICT = 409,

  /**
   * Request was well-formed but unable to be followed due to semantic errors.
   * Commonly used for validation errors.
   */
  UNPROCESSABLE_ENTITY = 422,

  /**
   * User has sent too many requests in a given amount of time.
   * Used for rate limiting. Include Retry-After header.
   */
  TOO_MANY_REQUESTS = 429,

  // 5xx Server Error Codes
  /**
   * Generic server error message when an unexpected condition was encountered.
   * Do not expose internal error details in production.
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * Server is currently unavailable (overloaded or down for maintenance).
   * Include Retry-After header when maintenance window is known.
   */
  SERVICE_UNAVAILABLE = 503,

  /**
   * Server acting as gateway did not receive timely response from upstream server.
   * Used when dependent service timeout occurs.
   */
  GATEWAY_TIMEOUT = 504
}