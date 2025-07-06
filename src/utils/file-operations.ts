import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../middleware/logging';

/**
 * File operation utilities with atomic operations and locking
 */

export class FileOperationError extends Error {
  constructor(message: string, public readonly operation: string, public readonly filePath: string) {
    super(message);
    this.name = 'FileOperationError';
  }
}

export class FileLockError extends Error {
  constructor(message: string, public readonly filePath: string) {
    super(message);
    this.name = 'FileLockError';
  }
}

/**
 * File lock manager for ensuring atomic operations
 */
export class FileLock {
  private static locks = new Map<string, Promise<void>>();

  /**
   * Acquire a lock for a file path
   */
  static async acquire(filePath: string, timeout: number = 5000): Promise<() => void> {
    const lockKey = path.resolve(filePath);
    
    // Wait for existing lock to be released
    if (FileLock.locks.has(lockKey)) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new FileLockError(`Lock timeout for file: ${filePath}`, filePath)), timeout);
      });
      
      try {
        await Promise.race([FileLock.locks.get(lockKey)!, timeoutPromise]);
      } catch (error) {
        if (error instanceof FileLockError) {
          throw error;
        }
        // Lock was released, continue
      }
    }

    // Create new lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = () => {
        FileLock.locks.delete(lockKey);
        resolve();
      };
    });

    FileLock.locks.set(lockKey, lockPromise);
    
    return releaseLock!;
  }
}

/**
 * Atomic file operations with backup and recovery
 */
export class AtomicFileOperations {
  /**
   * Atomically write data to a file with backup
   */
  static async writeFile(filePath: string, data: string, options: { backup?: boolean } = {}): Promise<void> {
    const release = await FileLock.acquire(filePath);
    
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      const tempPath = `${filePath}.tmp.${Date.now()}.${crypto.randomUUID().substring(0, 8)}`;
      const backupPath = `${filePath}.backup`;

      // Create backup if file exists and backup is enabled
      if (options.backup) {
        try {
          await fs.access(filePath);
          await fs.copyFile(filePath, backupPath);
          logger.debug(`Created backup: ${backupPath}`);
        } catch (error) {
          // File doesn't exist, no backup needed
        }
      }

      try {
        // Write to temporary file first
        await fs.writeFile(tempPath, data, 'utf8');
        
        // Atomic move to final location
        await fs.rename(tempPath, filePath);
        
        logger.debug(`Atomically wrote file: ${filePath}`);
      } catch (error) {
        // Clean up temp file on failure
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        
        throw new FileOperationError(
          `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'write',
          filePath
        );
      }
    } finally {
      release();
    }
  }

  /**
   * Safely read a file with error handling
   */
  static async readFile(filePath: string): Promise<string> {
    const release = await FileLock.acquire(filePath);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      logger.debug(`Read file: ${filePath}`);
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileOperationError('File not found', 'read', filePath);
      }
      
      throw new FileOperationError(
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'read',
        filePath
      );
    } finally {
      release();
    }
  }

  /**
   * Safely delete a file with backup
   */
  static async deleteFile(filePath: string, options: { backup?: boolean } = {}): Promise<void> {
    const release = await FileLock.acquire(filePath);
    
    try {
      // Create backup before deletion if requested
      if (options.backup) {
        const backupPath = `${filePath}.deleted.${Date.now()}`;
        try {
          await fs.copyFile(filePath, backupPath);
          logger.debug(`Created deletion backup: ${backupPath}`);
        } catch (error) {
          logger.warn(`Failed to create deletion backup: ${error}`);
        }
      }

      await fs.unlink(filePath);
      logger.debug(`Deleted file: ${filePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return;
      }
      
      throw new FileOperationError(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'delete',
        filePath
      );
    } finally {
      release();
    }
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      throw new FileOperationError(
        `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'mkdir',
        dirPath
      );
    }
  }

  /**
   * List files in a directory
   */
  static async listFiles(dirPath: string, extension?: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);
      
      if (extension) {
        return files.filter(file => path.extname(file) === extension);
      }
      
      return files;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      
      throw new FileOperationError(
        `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'readdir',
        dirPath
      );
    }
  }
}
