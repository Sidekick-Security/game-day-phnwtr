/**
 * @fileoverview Core TypeScript interfaces establishing foundational contracts for domain models,
 * DTOs, and repositories across all backend microservices. Implements strict type safety,
 * immutable properties, and standardized CRUD operations with proper error handling.
 * @version 1.0.0
 */

import { Timestamp } from '../types/common.types';

/**
 * Core interface for all database entities implementing optimistic concurrency.
 * Enforces immutable properties and version tracking for concurrent operations.
 */
export interface IBaseEntity extends Omit<Timestamp, 'deletedAt'> {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

/**
 * Base interface for all Data Transfer Objects (DTOs).
 * Implements immutable properties for type-safe API responses.
 */
export interface IBaseDTO extends Omit<Timestamp, 'deletedAt'> {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Options for paginated queries
 */
export interface PaginationOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Generic repository interface implementing type-safe CRUD operations.
 * Enforces proper error handling and optimistic concurrency.
 * @template T The entity type extending IBaseEntity
 */
export interface IBaseRepository<T extends IBaseEntity> {
  /**
   * Retrieves an entity by its unique identifier
   * @param id The entity's unique identifier
   * @returns Promise resolving to the found entity or null
   * @throws RepositoryError if database operation fails
   */
  findById(id: string): Promise<T | null>;

  /**
   * Retrieves all entities with optional pagination
   * @param options Optional pagination and sorting parameters
   * @returns Promise resolving to an array of entities
   * @throws RepositoryError if database operation fails
   */
  findAll(options?: PaginationOptions): Promise<T[]>;

  /**
   * Creates a new entity with optimistic concurrency
   * @param data Entity data excluding system fields
   * @returns Promise resolving to the created entity
   * @throws RepositoryError if database operation fails
   * @throws ValidationError if data is invalid
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<T>;

  /**
   * Updates an existing entity with version checking
   * @param id The entity's unique identifier
   * @param data Partial entity data to update
   * @param version Current entity version for optimistic locking
   * @returns Promise resolving to the updated entity
   * @throws RepositoryError if database operation fails
   * @throws ValidationError if data is invalid
   * @throws ConcurrencyError if version mismatch occurs
   */
  update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>>,
    version: number
  ): Promise<T>;

  /**
   * Deletes an entity with version checking
   * @param id The entity's unique identifier
   * @param version Current entity version for optimistic locking
   * @returns Promise resolving to void on success
   * @throws RepositoryError if database operation fails
   * @throws ConcurrencyError if version mismatch occurs
   */
  delete(id: string, version: number): Promise<void>;
}

/**
 * Custom error types for repository operations
 */
export class RepositoryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly errors: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConcurrencyError extends Error {
  constructor(message: string, public readonly entityId: string, public readonly version: number) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}