import * as path from 'path';
import { AtomicFileOperations } from '../utils/file-operations';
import { config } from '../config/environment';
import { logger } from '../middleware/logging';

/**
 * Data directory initialization and management service
 */
export class DataDirectoryService {
  private static instance: DataDirectoryService;
  private initialized = false;

  private constructor() {}

  static getInstance(): DataDirectoryService {
    if (!DataDirectoryService.instance) {
      DataDirectoryService.instance = new DataDirectoryService();
    }
    return DataDirectoryService.instance;
  }

  /**
   * Initialize the complete data directory structure
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing data directory structure...');
      
      // Main data directory
      await AtomicFileOperations.ensureDirectory(config.dataDir);
      
      // Core data directories
      const directories = [
        'protocols',
        'assessments', 
        'cache',
        'cache/etherscan',
        'cache/defillama',
        'cache/coingecko',
        'cache/slither',
        'logs',
        'backups',
        'temp',
      ];

      for (const dir of directories) {
        const fullPath = path.join(config.dataDir, dir);
        await AtomicFileOperations.ensureDirectory(fullPath);
      }

      // Create initial data files if they don't exist
      await this.initializeDataFiles();
      
      // Create gitkeep files for empty directories
      await this.createGitkeepFiles();

      this.initialized = true;
      logger.info(`Data directory structure initialized at: ${config.dataDir}`);
      
    } catch (error) {
      logger.error('Failed to initialize data directory:', error);
      throw error;
    }
  }

  /**
   * Initialize default data files
   */
  private async initializeDataFiles(): Promise<void> {
    // Initialize empty protocol index if it doesn't exist
    const protocolIndexPath = path.join(config.dataDir, 'protocols', 'index.json');
    if (!(await AtomicFileOperations.fileExists(protocolIndexPath))) {
      await AtomicFileOperations.writeFile(protocolIndexPath, '{}');
      logger.debug('Created protocols index file');
    }

    // Initialize empty assessment index if it doesn't exist
    const assessmentIndexPath = path.join(config.dataDir, 'assessments', 'index.json');
    if (!(await AtomicFileOperations.fileExists(assessmentIndexPath))) {
      await AtomicFileOperations.writeFile(assessmentIndexPath, '{}');
      logger.debug('Created assessments index file');
    }

    // Create README file with directory structure explanation
    const readmePath = path.join(config.dataDir, 'README.md');
    if (!(await AtomicFileOperations.fileExists(readmePath))) {
      const readmeContent = this.generateReadmeContent();
      await AtomicFileOperations.writeFile(readmePath, readmeContent);
      logger.debug('Created data directory README');
    }
  }

  /**
   * Create .gitkeep files for empty directories
   */
  private async createGitkeepFiles(): Promise<void> {
    const gitkeepDirs = [
      'cache/etherscan',
      'cache/defillama', 
      'cache/coingecko',
      'cache/slither',
      'backups',
      'temp',
    ];

    for (const dir of gitkeepDirs) {
      const gitkeepPath = path.join(config.dataDir, dir, '.gitkeep');
      if (!(await AtomicFileOperations.fileExists(gitkeepPath))) {
        await AtomicFileOperations.writeFile(gitkeepPath, '# This file keeps the directory in git\n');
      }
    }
  }

  /**
   * Generate README content for data directory
   */
  private generateReadmeContent(): string {
    return `# DeFi Risk Assessment Data Directory

This directory contains all persistent data for the DeFi Risk Assessment service.

## Directory Structure

\`\`\`
data/
├── protocols/              # Protocol registry and data
│   ├── index.json         # Protocol metadata index
│   └── {protocolId}.json  # Individual protocol files
├── assessments/           # Risk assessment results
│   ├── index.json         # Assessment metadata index
│   └── {assessmentId}.json # Individual assessment files
├── cache/                 # External API response cache
│   ├── etherscan/         # Etherscan API responses
│   ├── defillama/         # DeFiLlama API responses
│   ├── coingecko/         # CoinGecko API responses
│   └── slither/           # Slither analysis cache
├── logs/                  # Application logs
│   ├── combined.log       # All application logs
│   └── error.log          # Error logs only
├── backups/               # Automatic backups
└── temp/                  # Temporary files
\`\`\`

## Data Format

All data files are stored as JSON with the following characteristics:
- Atomic file operations ensure data integrity
- Automatic backups are created before modifications
- File locking prevents concurrent write conflicts
- Indexing provides fast metadata lookups

## Maintenance

- Log files are automatically rotated (5MB max, 5 files kept)
- Backup files are created with timestamps
- Temporary files are automatically cleaned up
- Cache files have configurable TTL

Generated: ${new Date().toISOString()}
`;
  }

  /**
   * Get directory paths for different data types
   */
  getDirectoryPaths() {
    return {
      root: config.dataDir,
      protocols: path.join(config.dataDir, 'protocols'),
      assessments: path.join(config.dataDir, 'assessments'),
      cache: path.join(config.dataDir, 'cache'),
      logs: path.join(config.dataDir, 'logs'),
      backups: path.join(config.dataDir, 'backups'),
      temp: path.join(config.dataDir, 'temp'),
    };
  }

  /**
   * Check if data directory is properly initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      const paths = this.getDirectoryPaths();
      
      // Check if main directories exist
      for (const dirPath of Object.values(paths)) {
        if (!(await AtomicFileOperations.fileExists(dirPath))) {
          return false;
        }
      }
      
      // Check if index files exist
      const protocolIndex = path.join(paths.protocols, 'index.json');
      const assessmentIndex = path.join(paths.assessments, 'index.json');
      
      return (
        await AtomicFileOperations.fileExists(protocolIndex) &&
        await AtomicFileOperations.fileExists(assessmentIndex)
      );
    } catch {
      return false;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = path.join(config.dataDir, 'temp');
      const tempFiles = await AtomicFileOperations.listFiles(tempDir);
      
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const file of tempFiles) {
        const filePath = path.join(tempDir, file);
        const stats = await import('fs/promises').then(fs => fs.stat(filePath));
        
        if (now - stats.mtime.getTime() > maxAge) {
          await AtomicFileOperations.deleteFile(filePath);
          logger.debug(`Cleaned up old temp file: ${file}`);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup temp files:', error);
    }
  }
}

// Export singleton instance
export const dataDirectoryService = DataDirectoryService.getInstance();
