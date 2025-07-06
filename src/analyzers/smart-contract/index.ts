/**
 * Smart Contract Analyzer Module
 * Exports for Slither-based smart contract security analysis
 */

export { SmartContractAnalyzer, smartContractAnalyzer } from './smart-contract-analyzer';
export { SlitherService, slitherService } from './slither.service';
export { VulnerabilityParser } from './vulnerability-parser';
export { TechnicalRiskCalculator, technicalRiskCalculator } from './technical-risk-calculator';

export type {
  SlitherOptions,
  SlitherReport,
  SlitherResults,
  SlitherDetectorResult,
  SlitherPrinterResult,
  SlitherElement,
  SlitherSourceMapping,
  SlitherImpact,
  SlitherConfidence,
  Vulnerability,
  SourceLocation,
  AnalysisSummary,
  SlitherMetadata,
  Optimization,
  InformationalFinding,
  VulnerabilityScore,
  DeFiRiskCategories,
  SlitherError,
  SlitherTimeoutError,
  SlitherCompilationError,
  SlitherExecutionError
} from './types';

export type {
  SmartContractAnalysisResult,
  SmartContractInput
} from './smart-contract-analyzer';
