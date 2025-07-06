/**
 * Generic file repository interface for data persistence
 */

export interface FileRepository<T> {
  /**
   * Save an entity to storage
   */
  save(id: string, data: T): Promise<void>;

  /**
   * Find an entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities
   */
  findAll(): Promise<T[]>;

  /**
   * Delete an entity by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if an entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get the count of entities
   */
  count(): Promise<number>;

  /**
   * Find entities by a filter function
   */
  findWhere(predicate: (item: T) => boolean): Promise<T[]>;

  /**
   * Update an entity (save with existence check)
   */
  update(id: string, data: T): Promise<void>;

  /**
   * Get all entity IDs
   */
  getIds(): Promise<string[]>;
}

/**
 * Repository options for configuration
 */
export interface RepositoryOptions {
  basePath: string;
  indexing?: boolean;
  backup?: boolean;
  compression?: boolean;
  lockTimeout?: number; // milliseconds
  retryAttempts?: number;
}
