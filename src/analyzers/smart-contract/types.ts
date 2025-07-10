/**
 * Slither Analysis Types
 * Type definitions for Slither static analysis integration
 */

export interface SlitherOptions {
  detectors?: string[];
  excludeDetectors?: string[];
  configFile?: string;
  timeout?: number;
  compilationTarget?: string;
  compilerVersion?: string;
}

export interface SlitherReport {
  success: boolean;
  error?: string | null;
  results: SlitherResults;
  version: string;
  executionTime: number;
}

export interface SlitherResults {
  detectors: SlitherDetectorResult[];
  printers: SlitherPrinterResult[];
}

export interface SlitherDetectorResult {
  check: string;
  impact: SlitherImpact;
  confidence: SlitherConfidence;
  description: string;
  elements: SlitherElement[];
  first_markdown_element?: string;
  id: string;
  markdown: string;
}

export interface SlitherPrinterResult {
  printer: string;
  elements: SlitherElement[];
}

export interface SlitherElement {
  type: string;
  name: string;
  source_mapping: SlitherSourceMapping;
  type_specific_fields?: Record<string, any>;
}

export interface SlitherSourceMapping {
  start: number;
  length: number;
  filename_relative: string;
  filename_absolute: string;
  filename_short: string;
  is_dependency: boolean;
  lines: number[];
  starting_column: number;
  ending_column: number;
}

export enum SlitherImpact {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  INFORMATIONAL = 'Informational',
  OPTIMIZATION = 'Optimization'
}

export enum SlitherConfidence {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface Vulnerability {
  detector: string;
  severity: SlitherImpact;
  confidence: SlitherConfidence;
  description: string;
  location: SourceLocation;
  impact: string;
  recommendation: string;
  id: string;
  markdown: string;
}

export interface SourceLocation {
  filename: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface AnalysisSummary {
  totalVulnerabilities: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  informationalCount: number;
  executionTime: number;
  contractsAnalyzed: number;
}

export interface SlitherMetadata {
  slitherVersion: string;
  solidityVersion?: string;
  compilationSuccess: boolean;
  analysisTimestamp: Date;
  configUsed: string;
  detectorCount: number;
}

export interface Optimization {
  type: string;
  description: string;
  location: SourceLocation;
  gasImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface InformationalFinding {
  type: string;
  description: string;
  location: SourceLocation;
  category: 'CODE_QUALITY' | 'BEST_PRACTICES' | 'DOCUMENTATION';
}

export interface VulnerabilityScore {
  severity: SlitherImpact;
  confidence: SlitherConfidence;
  baseScore: number;
  weightedScore: number;
}

export interface DeFiRiskCategories {
  flashLoanVulnerabilities: number;
  oracleManipulation: number;
  reentrancyRisks: number;
  accessControlIssues: number;
  upgradeabilityRisks: number;
  governanceVulnerabilities: number;
}

// Error types for Slither operations
export class SlitherError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SlitherError';
  }
}

export class SlitherTimeoutError extends SlitherError {
  constructor(timeout: number) {
    super(`Slither analysis timed out after ${timeout}ms`, 'TIMEOUT');
  }
}

export class SlitherCompilationError extends SlitherError {
  constructor(compilationOutput: string) {
    super('Contract compilation failed', 'COMPILATION_FAILED', compilationOutput);
  }
}

export class SlitherExecutionError extends SlitherError {
  constructor(exitCode: number, stderr: string) {
    super(`Slither execution failed with exit code ${exitCode}`, 'EXECUTION_FAILED', { exitCode, stderr });
  }
}
