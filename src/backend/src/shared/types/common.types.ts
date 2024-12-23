/**
 * @fileoverview Core TypeScript type definitions used across all backend microservices.
 * Implements strict type safety with comprehensive documentation and utility types
 * for enterprise-grade development.
 * @version 1.0.0
 */

/**
 * Standard API response structure with strict null checking and readonly properties
 * @template T The type of data being returned
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: ErrorResponse | null;
  readonly message: string;
  readonly statusCode: HttpStatusCode;
  readonly timestamp: Date;
}

/**
 * Generic paginated response structure for list endpoints
 * @template T The type of items being paginated
 */
export interface PaginatedResponse<T> {
  readonly items: T[];
  readonly pagination: PaginationParams;
}

/**
 * Enhanced pagination parameters with additional utility fields
 */
export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly hasMore: boolean;
}

/**
 * Type-safe sort order enumeration
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Comprehensive HTTP status codes enumeration
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Enhanced error response structure with stack traces for development
 */
export interface ErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly stack?: string;
}

/**
 * Timestamp fields for soft-delete capable models
 */
export interface Timestamp {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

/**
 * Type-safe query filter structure with strict operator types
 */
export interface QueryFilter {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
}

/**
 * Comprehensive filter operators for query building
 */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  IN = 'in',
  NOT_IN = 'nin'
}

/**
 * Type guard to check if a value is a valid FilterOperator
 * @param value The value to check
 * @returns boolean indicating if the value is a valid FilterOperator
 */
export const isFilterOperator = (value: string): value is FilterOperator => {
  return Object.values(FilterOperator).includes(value as FilterOperator);
};

/**
 * Type guard to check if a value is a valid SortOrder
 * @param value The value to check
 * @returns boolean indicating if the value is a valid SortOrder
 */
export const isSortOrder = (value: string): value is SortOrder => {
  return Object.values(SortOrder).includes(value as SortOrder);
};

/**
 * Utility type for making all properties in an object required and readonly
 * @template T The type to make immutable
 */
export type Immutable<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * Utility type for making all properties in an object optional
 * @template T The type to make partial
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Utility type for extracting the type of an array's elements
 * @template T The array type
 */
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer E)[] ? E : never;