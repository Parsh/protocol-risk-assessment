import * as path from 'path';
import { FileRepository, RepositoryOptions } from './file-repository.interface';
import { AtomicFileOperations, FileOperationError } from '../utils/file-operations';
import { logger } from '../middleware/logging';
import { BaseEntity } from '../models';

/**
 * JSON-based file repository implementation with atomic operations and indexing
 */
export class JsonFileRepository<T extends BaseEntity> implements FileRepository<T> {
  private readonly basePath: string;
  private readonly indexPath: string;
  private readonly options: Required<RepositoryOptions>;
  private indexCache: Map<string, any> = new Map();
  private lastIndexLoad: number = 0;
  private readonly INDEX_CACHE_TTL = 30000; // 30 seconds

  constructor(entityName: string, options: RepositoryOptions) {
    this.options = {
      indexing: true,
      backup: true,
      compression: false,
      lockTimeout: 5000,
      retryAttempts: 3,
      ...options,
    };

    this.basePath = path.join(this.options.basePath, entityName);
    this.indexPath = path.join(this.basePath, 'index.json');

    // Initialize directory structure
    this.initializeDirectory().catch(error => {
      logger.error(`Failed to initialize directory for ${entityName}:`, error);
    });
  }

  /**
   * Initialize the directory structure
   */
  private async initializeDirectory(): Promise<void> {
    await AtomicFileOperations.ensureDirectory(this.basePath);
    
    // Create index file if it doesn't exist
    if (this.options.indexing && !(await AtomicFileOperations.fileExists(this.indexPath))) {
      await this.saveIndex({});
      logger.info(`Initialized index for repository at: ${this.basePath}`);
    }
  }

  /**
   * Get file path for an entity
   */
  private getFilePath(id: string): string {
    return path.join(this.basePath, `${id}.json`);
  }

  /**
   * Load index from file with caching
   */
  private async loadIndex(): Promise<Record<string, any>> {
    if (!this.options.indexing) {
      return {};
    }

    const now = Date.now();
    if (this.indexCache.size > 0 && (now - this.lastIndexLoad) < this.INDEX_CACHE_TTL) {
      return Object.fromEntries(this.indexCache);
    }

    try {
      const indexData = await AtomicFileOperations.readFile(this.indexPath);
      const index = JSON.parse(indexData);
      
      // Update cache
      this.indexCache.clear();
      Object.entries(index).forEach(([key, value]) => {
        this.indexCache.set(key, value);
      });
      this.lastIndexLoad = now;
      
      return index;
    } catch (error) {
      if (error instanceof FileOperationError && error.operation === 'read') {
        // Index doesn't exist, return empty
        return {};
      }
      throw error;
    }
  }

  /**
   * Save index to file
   */
  private async saveIndex(index: Record<string, any>): Promise<void> {
    if (!this.options.indexing) {
      return;
    }

    const indexData = JSON.stringify(index, null, 2);
    await AtomicFileOperations.writeFile(this.indexPath, indexData, { backup: this.options.backup });
    
    // Update cache
    this.indexCache.clear();
    Object.entries(index).forEach(([key, value]) => {
      this.indexCache.set(key, value);
    });
    this.lastIndexLoad = Date.now();
  }

  /**
   * Update index entry for an entity
   */
  private async updateIndexEntry(id: string, entity: T): Promise<void> {
    if (!this.options.indexing) {
      return;
    }

    const index = await this.loadIndex();
    index[id] = {
      id: entity.id,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      // Add entity-specific index fields if needed
    };
    
    await this.saveIndex(index);
  }

  /**
   * Remove index entry for an entity
   */
  private async removeIndexEntry(id: string): Promise<void> {
    if (!this.options.indexing) {
      return;
    }

    const index = await this.loadIndex();
    delete index[id];
    await this.saveIndex(index);
  }

  /**
   * Retry operation with exponential backoff
   */
  private async withRetry<R>(operation: () => Promise<R>, operationName: string): Promise<R> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.options.retryAttempts - 1) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          logger.warn(`${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.options.retryAttempts}):`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${this.options.retryAttempts} attempts: ${lastError!.message}`);
  }

  // FileRepository interface implementation

  async save(id: string, data: T): Promise<void> {
    await this.withRetry(async () => {
      const filePath = this.getFilePath(id);
      
      // Ensure entity has proper timestamps
      const now = new Date();
      const entity: T = {
        ...data,
        id,
        updatedAt: now,
        createdAt: data.createdAt || now,
      };

      const jsonData = JSON.stringify(entity, null, 2);
      await AtomicFileOperations.writeFile(filePath, jsonData, { backup: this.options.backup });
      await this.updateIndexEntry(id, entity);
      
      logger.debug(`Saved entity ${id} to ${filePath}`);
    }, `Save entity ${id}`);
  }

  async findById(id: string): Promise<T | null> {
    return await this.withRetry(async () => {
      const filePath = this.getFilePath(id);
      
      if (!(await AtomicFileOperations.fileExists(filePath))) {
        return null;
      }

      try {
        const data = await AtomicFileOperations.readFile(filePath);
        const entity = JSON.parse(data) as T;
        
        // Convert date strings back to Date objects
        if (entity.createdAt) entity.createdAt = new Date(entity.createdAt);
        if (entity.updatedAt) entity.updatedAt = new Date(entity.updatedAt);
        
        return entity;
      } catch (error) {
        logger.error(`Failed to parse JSON for entity ${id}:`, error);
        return null;
      }
    }, `Find entity by ID ${id}`);
  }

  async findAll(): Promise<T[]> {
    return await this.withRetry(async () => {
      const files = await AtomicFileOperations.listFiles(this.basePath, '.json');
      const entities: T[] = [];
      
      for (const file of files) {
        // Skip index files
        if (file === 'index.json') continue;
        
        // Skip backup files and deleted files
        if (file.includes('.backup') || file.includes('.deleted.')) continue;
        
        const id = path.basename(file, '.json');
        const entity = await this.findById(id);
        
        if (entity) {
          entities.push(entity);
        }
      }
      
      // Sort by creation date (newest first)
      return entities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, 'Find all entities');
  }

  async delete(id: string): Promise<void> {
    await this.withRetry(async () => {
      const filePath = this.getFilePath(id);
      
      if (await AtomicFileOperations.fileExists(filePath)) {
        await AtomicFileOperations.deleteFile(filePath, { backup: this.options.backup });
        await this.removeIndexEntry(id);
        logger.debug(`Deleted entity ${id} from ${filePath}`);
      }
    }, `Delete entity ${id}`);
  }

  async exists(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    return await AtomicFileOperations.fileExists(filePath);
  }

  async count(): Promise<number> {
    return await this.withRetry(async () => {
      if (this.options.indexing) {
        const index = await this.loadIndex();
        return Object.keys(index).length;
      }
      
      const files = await AtomicFileOperations.listFiles(this.basePath, '.json');
      return files.filter(file => {
        // Skip index files
        if (file === 'index.json') return false;
        
        // Skip backup files and deleted files
        if (file.includes('.backup') || file.includes('.deleted.')) return false;
        
        return true;
      }).length;
    }, 'Count entities');
  }

  async findWhere(predicate: (item: T) => boolean): Promise<T[]> {
    const allEntities = await this.findAll();
    return allEntities.filter(predicate);
  }

  async update(id: string, data: T): Promise<void> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new Error(`Entity with ID ${id} does not exist`);
    }
    
    await this.save(id, data);
  }

  async getIds(): Promise<string[]> {
    return await this.withRetry(async () => {
      if (this.options.indexing) {
        const index = await this.loadIndex();
        return Object.keys(index);
      }
      
      const files = await AtomicFileOperations.listFiles(this.basePath, '.json');
      return files
        .filter(file => file !== 'index.json')
        .map(file => path.basename(file, '.json'));
    }, 'Get entity IDs');
  }
}
