/**
 * Governance Analysis Types
 * Defines interfaces and types for governance risk assessment
 */

export interface GovernanceAnalysis {
  tokenDistribution: TokenDistribution;
  votingPower: VotingPowerAnalysis;
  multiSigAnalysis: MultiSigAnalysis;
  proposalHistory: ProposalHistory;
  governanceScore: number;
  riskLevel: GovernanceRiskLevel;
  recommendations: string[];
  metadata: GovernanceMetadata;
}

export interface TokenDistribution {
  totalSupply: number;
  circulatingSupply: number;
  holderCount: number;
  topHolders: TokenHolder[];
  concentrationRatio: number; // Top 10 holders percentage
  giniCoefficient: number; // Wealth distribution inequality
  treasuryBalance: number;
  foundationBalance: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
  isExchange: boolean;
  isFoundation: boolean;
  tags: string[];
}

export interface VotingPowerAnalysis {
  votingModel: VotingModel;
  quorumRequirement: number;
  proposalThreshold: number;
  votingDelay: number; // blocks or time
  votingPeriod: number; // blocks or time
  timelock: TimelockAnalysis;
  delegationStats: DelegationStats;
  powerConcentration: PowerConcentration;
}

export interface TimelockAnalysis {
  hasTimelock: boolean;
  timelockDelay: number; // seconds
  timelockAdmin: string;
  adminType: 'EOA' | 'MULTISIG' | 'DAO' | 'CONTRACT';
  emergencyActions: EmergencyAction[];
}

export interface EmergencyAction {
  functionSignature: string;
  bypassTimelock: boolean;
  requiredRole: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DelegationStats {
  totalDelegated: number;
  delegationPercentage: number;
  topDelegates: Delegate[];
  averageDelegationSize: number;
  selfDelegation: number;
}

export interface Delegate {
  address: string;
  votingPower: number;
  percentage: number;
  delegatorCount: number;
  isActive: boolean;
  participationRate: number;
}

export interface PowerConcentration {
  top1Percentage: number;
  top5Percentage: number;
  top10Percentage: number;
  nakamotoCoefficient: number; // Min entities to control >50%
  shapleyValue: number; // Game theory power distribution
}

export interface MultiSigAnalysis {
  multiSigs: MultiSigWallet[];
  totalControlledValue: number;
  averageSignatureRequirement: number;
  signerOverlap: SignerOverlap[];
  emergencyMultiSigs: MultiSigWallet[];
}

export interface MultiSigWallet {
  address: string;
  purpose: MultiSigPurpose;
  requiredSignatures: number;
  totalSigners: number;
  signers: MultiSigSigner[];
  controlledFunds: number;
  lastActivity: Date;
  isActive: boolean;
}

export interface MultiSigSigner {
  address: string;
  isKnown: boolean;
  identity?: string;
  role?: string;
  isActive: boolean;
  signatureHistory: number;
}

export interface SignerOverlap {
  wallet1: string;
  wallet2: string;
  sharedSigners: number;
  overlapPercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProposalHistory {
  totalProposals: number;
  passedProposals: number;
  failedProposals: number;
  cancelledProposals: number;
  averageParticipation: number;
  proposalFrequency: number; // proposals per month
  recentProposals: GovernanceProposal[];
  controversialProposals: GovernanceProposal[];
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  participation: number;
  createdAt: Date;
  startTime: Date;
  endTime: Date;
  executedAt?: Date;
  category: ProposalCategory;
  riskImpact: RiskImpact;
}

export interface GovernanceMetadata {
  protocolName: string;
  governanceToken: string;
  governanceContract: string;
  analysisTimestamp: Date;
  dataSource: DataSource;
  blockHeight: number;
  analysisVersion: string;
}

export enum VotingModel {
  TOKEN_WEIGHTED = 'TOKEN_WEIGHTED',
  QUADRATIC = 'QUADRATIC',
  ONE_PERSON_ONE_VOTE = 'ONE_PERSON_ONE_VOTE',
  DELEGATED_PROOF_OF_STAKE = 'DELEGATED_PROOF_OF_STAKE',
  HYBRID = 'HYBRID'
}

export enum MultiSigPurpose {
  TREASURY = 'TREASURY',
  PROTOCOL_UPGRADES = 'PROTOCOL_UPGRADES',
  EMERGENCY_ACTIONS = 'EMERGENCY_ACTIONS',
  PARAMETER_CHANGES = 'PARAMETER_CHANGES',
  TOKEN_MINTING = 'TOKEN_MINTING',
  CROSS_CHAIN = 'CROSS_CHAIN',
  GENERAL = 'GENERAL'
}

export enum ProposalStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUCCEEDED = 'SUCCEEDED',
  DEFEATED = 'DEFEATED',
  QUEUED = 'QUEUED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum ProposalCategory {
  PROTOCOL_UPGRADE = 'PROTOCOL_UPGRADE',
  PARAMETER_CHANGE = 'PARAMETER_CHANGE',
  TREASURY_ALLOCATION = 'TREASURY_ALLOCATION',
  GOVERNANCE_CHANGE = 'GOVERNANCE_CHANGE',
  EMERGENCY_ACTION = 'EMERGENCY_ACTION',
  PARTNERSHIP = 'PARTNERSHIP',
  GRANT_ALLOCATION = 'GRANT_ALLOCATION',
  TOKEN_ECONOMICS = 'TOKEN_ECONOMICS',
  OTHER = 'OTHER'
}

export enum RiskImpact {
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum GovernanceRiskLevel {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  MODERATE = 'MODERATE',
  CONCERNING = 'CONCERNING',
  HIGH_RISK = 'HIGH_RISK'
}

export enum DataSource {
  ON_CHAIN = 'ON_CHAIN',
  GOVERNANCE_API = 'GOVERNANCE_API',
  SNAPSHOT = 'SNAPSHOT',
  TALLY = 'TALLY',
  COMPOUND = 'COMPOUND',
  MIXED = 'MIXED'
}

export interface GovernanceRiskFactors {
  concentrationRisk: number;
  multiSigRisk: number;
  participationRisk: number;
  transparencyRisk: number;
  executionRisk: number;
  emergencyRisk: number;
}

export interface GovernanceConfig {
  minHolderCount: number;
  maxConcentrationRatio: number;
  minParticipationRate: number;
  minProposalFrequency: number;
  maxTimelockDelay: number;
  minMultiSigThreshold: number;
  weights: GovernanceWeights;
}

export interface GovernanceWeights {
  tokenDistribution: number;
  votingPower: number;
  multiSigAnalysis: number;
  proposalHistory: number;
  participation: number;
  transparency: number;
}
