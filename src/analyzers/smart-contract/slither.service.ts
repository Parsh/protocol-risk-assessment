/**
 * Slither Service
 * Service for running Slither static analysis on smart contracts
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../config/logger';
import {
  SlitherOptions,
  SlitherReport,
  SlitherResults,
  SlitherError,
  SlitherTimeoutError,
  SlitherCompilationError,
  SlitherExecutionError,
  Vulnerability,
  AnalysisSummary,
  SlitherMetadata
} from './types';

export class SlitherService {
  private readonly slitherExecutable: string;
  private readonly workspaceDir: string;
  private readonly configDir: string;
  private readonly defaultTimeout: number = 300000; // 5 minutes

  constructor() {
    // Use the virtual environment's slither executable
    this.slitherExecutable = '/Users/psyched/ENITS/IT-SecLab/protocol-risk-assessment/.venv/bin/slither';
    this.workspaceDir = path.join(process.cwd(), 'tmp', 'slither-analysis');
    this.configDir = path.join(process.cwd(), 'config', 'slither');
  }

  /**
   * Analyze a smart contract from source code
   */
  async analyzeContract(
    contractCode: string,
    contractName: string,
    options: SlitherOptions = {}
  ): Promise<SlitherReport> {
    const analysisId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info(`Starting Slither analysis for contract: ${contractName}`, {
        analysisId,
        contractName,
        options
      });

      // Create temporary contract file
      const contractPath = await this.createTempContract(contractCode, contractName, analysisId);
      
      // Run Slither analysis
      const results = await this.runSlitherAnalysis(contractPath, options, analysisId);
      
      // Parse and validate results
      const report = await this.parseSlitherResults(results, startTime);
      
      logger.info(`Slither analysis completed successfully`, {
        analysisId,
        contractName,
        executionTime: report.executionTime,
        vulnerabilityCount: report.results.detectors.length
      });

      return report;

    } catch (error) {
      logger.error(`Slither analysis failed`, {
        analysisId,
        contractName,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      });

      if (error instanceof SlitherError) {
        throw error;
      }

      throw new SlitherError(
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_FAILED',
        error
      );
    } finally {
      // Cleanup temporary files
      await this.cleanupTempFiles(analysisId);
    }
  }

  /**
   * Analyze multiple contracts from a directory
   */
  async analyzeDirectory(
    directoryPath: string,
    options: SlitherOptions = {}
  ): Promise<SlitherReport> {
    const analysisId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info(`Starting Slither directory analysis`, {
        analysisId,
        directoryPath,
        options
      });

      // Validate directory exists
      await this.validateDirectory(directoryPath);

      // Run Slither analysis on directory
      const results = await this.runSlitherAnalysis(directoryPath, options, analysisId);
      
      // Parse and validate results
      const report = await this.parseSlitherResults(results, startTime);
      
      logger.info(`Slither directory analysis completed successfully`, {
        analysisId,
        directoryPath,
        executionTime: report.executionTime,
        vulnerabilityCount: report.results.detectors.length
      });

      return report;

    } catch (error) {
      logger.error(`Slither directory analysis failed`, {
        analysisId,
        directoryPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Create temporary contract file for analysis
   */
  private async createTempContract(
    contractCode: string,
    contractName: string,
    analysisId: string
  ): Promise<string> {
    const fileName = `${contractName}-${analysisId}.sol`;
    const filePath = path.join(this.workspaceDir, fileName);

    // Ensure workspace directory exists
    await fs.mkdir(this.workspaceDir, { recursive: true });

    // Write contract to temporary file
    await fs.writeFile(filePath, contractCode, 'utf8');

    logger.debug(`Created temporary contract file`, {
      analysisId,
      contractName,
      filePath
    });

    return filePath;
  }

  /**
   * Run Slither analysis process
   */
  private async runSlitherAnalysis(
    targetPath: string,
    options: SlitherOptions,
    analysisId: string
  ): Promise<string> {
    const outputFile = path.join(this.workspaceDir, `analysis-${analysisId}.json`);
    const configFile = options.configFile || path.join(this.configDir, 'slither.config.json');

    const args = [
      targetPath,
      '--json', outputFile,
      '--config-file', configFile,
      '--solc', '/Users/psyched/.solc-select/artifacts/solc-0.8.19/solc-0.8.19',
      ...this.buildDetectorArgs(options)
    ];

    logger.debug(`Running Slither with args`, {
      analysisId,
      executable: this.slitherExecutable,
      args
    });

    return new Promise((resolve, reject) => {
      const timeout = options.timeout || this.defaultTimeout;
      let timeoutHandle: NodeJS.Timeout;

      const slitherProcess: ChildProcess = spawn(this.slitherExecutable, args, {
        cwd: this.workspaceDir,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      slitherProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      slitherProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      slitherProcess.on('close', async (code) => {
        clearTimeout(timeoutHandle);

        try {
          // Slither exits with 0 for success, 1 or 255 when vulnerabilities are found (not an error)
          if (code === 0 || code === 1 || code === 255) {
            // Add a small delay to ensure file is written
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if file exists before reading
            try {
              await fs.access(outputFile);
              const results = await fs.readFile(outputFile, 'utf8');
              resolve(results);
            } catch (fileError) {
              logger.error('Output file not found or not readable', {
                analysisId,
                outputFile,
                fileError: fileError instanceof Error ? fileError.message : 'Unknown error'
              });
              reject(new SlitherError(
                `Output file not found: ${outputFile}`,
                'OUTPUT_FILE_NOT_FOUND',
                fileError
              ));
            }
          } else {
            logger.error(`Slither process failed`, {
              analysisId,
              exitCode: code,
              stderr,
              stdout
            });

            if (stderr.includes('compilation failed') || stderr.includes('CompilerError')) {
              reject(new SlitherCompilationError(stderr));
            } else {
              reject(new SlitherExecutionError(code || -1, stderr));
            }
          }
        } catch (error) {
          logger.error('Error reading Slither output file', {
            analysisId,
            outputFile,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          reject(new SlitherError(
            'Failed to read Slither output',
            'OUTPUT_READ_FAILED',
            error
          ));
        }
      });

      slitherProcess.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(new SlitherError(
          `Failed to start Slither process: ${error.message}`,
          'PROCESS_START_FAILED',
          error
        ));
      });

      // Set timeout
      timeoutHandle = setTimeout(() => {
        slitherProcess.kill('SIGTERM');
        reject(new SlitherTimeoutError(timeout));
      }, timeout);
    });
  }

  /**
   * Parse Slither JSON results
   */
  private async parseSlitherResults(
    resultsJson: string,
    startTime: number
  ): Promise<SlitherReport> {
    try {
      logger.debug('Parsing Slither JSON results', {
        jsonLength: resultsJson.length,
        jsonPreview: resultsJson.substring(0, 200)
      });
      
      // Parse the JSON wrapper that Slither outputs
      const slitherWrapper = JSON.parse(resultsJson);
      
      // Extract the results from the wrapper
      const results: SlitherResults = slitherWrapper.results || { detectors: [], printers: [] };
      
      logger.debug('Slither JSON parsed successfully', {
        hasWrapper: !!slitherWrapper.results,
        wrapperSuccess: slitherWrapper.success,
        wrapperError: slitherWrapper.error,
        hasDetectors: !!results.detectors,
        detectorsCount: results.detectors?.length || 0,
        hasPrinters: !!results.printers,
        printersCount: results.printers?.length || 0
      });
      
      return {
        success: slitherWrapper.success !== false,
        error: slitherWrapper.error,
        results,
        version: await this.getSlitherVersion(),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Failed to parse Slither JSON output', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jsonLength: resultsJson.length,
        jsonPreview: resultsJson.substring(0, 200)
      });
      
      throw new SlitherError(
        'Failed to parse Slither JSON output',
        'JSON_PARSE_FAILED',
        error
      );
    }
  }

  /**
   * Build detector arguments for Slither command
   */
  private buildDetectorArgs(options: SlitherOptions): string[] {
    const args: string[] = [];

    if (options.detectors && options.detectors.length > 0) {
      args.push('--detect', options.detectors.join(','));
    }

    if (options.excludeDetectors && options.excludeDetectors.length > 0) {
      args.push('--exclude', options.excludeDetectors.join(','));
    }

    return args;
  }

  /**
   * Get Slither version
   */
  private async getSlitherVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const versionProcess = spawn(this.slitherExecutable, ['--version']);
      let output = '';

      versionProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      versionProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new SlitherError('Failed to get Slither version', 'VERSION_CHECK_FAILED'));
        }
      });

      versionProcess.on('error', (error) => {
        reject(new SlitherError(
          `Failed to check Slither version: ${error.message}`,
          'VERSION_CHECK_FAILED',
          error
        ));
      });
    });
  }

  /**
   * Validate directory exists and is readable
   */
  private async validateDirectory(directoryPath: string): Promise<void> {
    try {
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        throw new SlitherError(
          `Path is not a directory: ${directoryPath}`,
          'INVALID_DIRECTORY'
        );
      }
    } catch (error) {
      if (error instanceof SlitherError) {
        throw error;
      }
      throw new SlitherError(
        `Directory not found or not accessible: ${directoryPath}`,
        'DIRECTORY_ACCESS_FAILED',
        error
      );
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(analysisId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.workspaceDir);
      const tempFiles = files.filter(file => file.includes(analysisId));

      for (const file of tempFiles) {
        const filePath = path.join(this.workspaceDir, file);
        await fs.unlink(filePath);
        logger.debug(`Cleaned up temporary file: ${filePath}`, { analysisId });
      }
    } catch (error) {
      logger.warn(`Failed to cleanup temporary files for analysis ${analysisId}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const slitherService = new SlitherService();
