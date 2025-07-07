/**
 * Assessment Controller
 * REST API endpoints for assessment management
 * Stage 3.2: Assessment API implementation
 */

import { Request, Response, NextFunction } from 'express';
import { 
  AssessmentOrchestrator, 
  AssessmentRequest as ServiceAssessmentRequest,
  AssessmentResponse as ServiceAssessmentResponse,
  AssessmentProgress 
} from '../services/assessment-orchestrator';
import { 
  AssessmentStatus, 
  RiskLevel, 
  ProtocolCategory, 
  AnalysisDepth, 
  AssessmentPriority,
  RiskAssessment
} from '../models/index';
import { logger } from '../config/logger';
import Joi from 'joi';

/**
 * API Request/Response Types
 */
export interface CreateAssessmentRequest {
  protocolId?: string;
  protocol?: {
    name: string;
    contractAddresses: string[];
    blockchain: string;
    tokenSymbol?: string;
    website?: string;
    documentation?: string;
    category?: ProtocolCategory;
    tags?: string[];
  };
  priority?: AssessmentPriority;
  analysisDepth?: AnalysisDepth;
}

export interface AssessmentStatusResponse {
  assessmentId: string;
  status: AssessmentStatus;
  progress: number;
  currentStage?: string;
  startedAt: Date;
  estimatedCompletionAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface AssessmentResultResponse extends RiskAssessment {
  // Extends RiskAssessment with no additional fields for now
}

export interface ListAssessmentsQuery {
  status?: AssessmentStatus;
  protocolId?: string;
  limit?: string;
  offset?: string;
}

export interface ListAssessmentsResponse {
  assessments: RiskAssessment[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Validation Schemas
 */
const createAssessmentSchema = Joi.object({
  protocolId: Joi.string().optional(),
  protocol: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    contractAddresses: Joi.array()
      .items(Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/))
      .min(1)
      .required(),
    blockchain: Joi.string().valid('ethereum', 'arbitrum', 'optimism', 'avalanche', 'fantom').required(),
    tokenSymbol: Joi.string().min(1).max(10).optional(),
    website: Joi.string().uri().optional(),
    documentation: Joi.string().uri().optional(),
    category: Joi.string().valid(...Object.values(ProtocolCategory)).optional(),
    tags: Joi.array().items(Joi.string().min(1).max(50)).optional()
  }).optional(),
  priority: Joi.string().valid(...Object.values(AssessmentPriority)).optional(),
  analysisDepth: Joi.string().valid(...Object.values(AnalysisDepth)).optional()
}).xor('protocolId', 'protocol'); // Either protocolId OR protocol must be provided

const listAssessmentsSchema = Joi.object({
  status: Joi.string().valid(...Object.values(AssessmentStatus)).optional(),
  protocolId: Joi.string().optional(),
  limit: Joi.string().pattern(/^\d+$/).optional(),
  offset: Joi.string().pattern(/^\d+$/).optional()
});

/**
 * Assessment Controller Class
 * Handles all assessment-related HTTP endpoints
 */
export class AssessmentController {
  private orchestrator: AssessmentOrchestrator;

  constructor() {
    this.orchestrator = new AssessmentOrchestrator();
  }

  /**
   * POST /api/v1/assessments
   * Initiate a new risk assessment
   */
  async createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = createAssessmentSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const assessmentRequest: ServiceAssessmentRequest = value;

      logger.info('Creating new assessment', { 
        protocolId: assessmentRequest.protocolId,
        protocolName: assessmentRequest.protocol?.name,
        userId: req.ip 
      });

      // Initiate assessment via orchestrator
      const response: ServiceAssessmentResponse = await this.orchestrator.initiateAssessment(assessmentRequest);

      logger.info('Assessment created successfully', { 
        assessmentId: response.assessmentId,
        protocolId: response.protocolId 
      });

      res.status(201).json({
        success: true,
        data: response
      });

    } catch (error) {
      logger.error('Failed to create assessment', { error: (error as Error).message, body: req.body });
      next(error);
    }
  }

  /**
   * GET /api/v1/assessments/:id
   * Get assessment details and results
   */
  async getAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          error: 'Invalid assessment ID'
        });
        return;
      }

      logger.info('Fetching assessment details', { assessmentId: id });

      // Get assessment result
      const assessment: RiskAssessment = await this.orchestrator.getAssessmentResult(id);

      const response: AssessmentResultResponse = {
        ...assessment
      };

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: 'Assessment not found',
          assessmentId: req.params.id
        });
        return;
      }

      if (errorMessage.includes('not completed')) {
        res.status(400).json({
          error: 'Assessment not completed yet',
          assessmentId: req.params.id,
          message: 'Use /status endpoint to check progress'
        });
        return;
      }

      logger.error('Failed to get assessment', { error: errorMessage, assessmentId: req.params.id });
      next(error);
    }
  }

  /**
   * GET /api/v1/assessments/:id/status
   * Get assessment status and progress
   */
  async getAssessmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          error: 'Invalid assessment ID'
        });
        return;
      }

      logger.info('Fetching assessment status', { assessmentId: id });

      // Get assessment progress
      const progress: AssessmentProgress = await this.orchestrator.getAssessmentStatus(id);

      const response: AssessmentStatusResponse = {
        ...progress
      };

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: 'Assessment not found',
          assessmentId: req.params.id
        });
        return;
      }

      logger.error('Failed to get assessment status', { error: errorMessage, assessmentId: req.params.id });
      next(error);
    }
  }

  /**
   * GET /api/v1/assessments
   * List assessments with optional filtering
   */
  async listAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate query parameters
      const { error, value } = listAssessmentsSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const query: ListAssessmentsQuery = value;
      const limit = parseInt(query.limit || '20', 10);
      const offset = parseInt(query.offset || '0', 10);

      // Validate limit and offset ranges
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Limit must be between 1 and 100'
        });
        return;
      }

      if (offset < 0) {
        res.status(400).json({
          error: 'Offset must be non-negative'
        });
        return;
      }

      logger.info('Listing assessments', { 
        status: query.status, 
        protocolId: query.protocolId, 
        limit, 
        offset 
      });

      // Get assessments from orchestrator
      const assessmentOptions: {
        status?: AssessmentStatus;
        protocolId?: string;
        limit: number;
        offset: number;
      } = { limit, offset };

      if (query.status) {
        assessmentOptions.status = query.status;
      }
      if (query.protocolId) {
        assessmentOptions.protocolId = query.protocolId;
      }

      const assessments = await this.orchestrator.getAssessments(assessmentOptions);

      // Get total count for pagination (simplified - returns all assessments then filters)
      const totalOptions: {
        status?: AssessmentStatus;
        protocolId?: string;
      } = {};

      if (query.status) {
        totalOptions.status = query.status;
      }
      if (query.protocolId) {
        totalOptions.protocolId = query.protocolId;
      }

      const totalAssessments = await this.orchestrator.getAssessments(totalOptions);

      const response: ListAssessmentsResponse = {
        assessments,
        total: totalAssessments.length,
        limit,
        offset
      };

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      logger.error('Failed to list assessments', { error: (error as Error).message, query: req.query });
      next(error);
    }
  }

  /**
   * DELETE /api/v1/assessments/:id
   * Cancel an active assessment
   */
  async cancelAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          error: 'Invalid assessment ID'
        });
        return;
      }

      logger.info('Cancelling assessment', { assessmentId: id });

      // Cancel assessment via orchestrator
      await this.orchestrator.cancelAssessment(id);

      logger.info('Assessment cancelled successfully', { assessmentId: id });

      res.status(200).json({
        success: true,
        message: 'Assessment cancelled successfully',
        assessmentId: id
      });

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('not found') || errorMessage.includes('not active')) {
        res.status(404).json({
          error: 'Assessment not found or not active',
          assessmentId: req.params.id
        });
        return;
      }

      if (errorMessage.includes('Cannot cancel completed')) {
        res.status(400).json({
          error: 'Cannot cancel completed assessment',
          assessmentId: req.params.id
        });
        return;
      }

      logger.error('Failed to cancel assessment', { error: errorMessage, assessmentId: req.params.id });
      next(error);
    }
  }
}

// Create singleton instance
export const assessmentController = new AssessmentController();
