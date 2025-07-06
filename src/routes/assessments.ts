/**
 * Assessment Routes
 * REST API routes for assessment management
 * Stage 3.2: Assessment API implementation
 */

import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller';

const router = Router();

/**
 * POST /api/v1/assessments
 * Initiate a new risk assessment
 */
router.post('/', async (req, res, next) => {
  await assessmentController.createAssessment(req, res, next);
});

/**
 * GET /api/v1/assessments
 * List assessments with optional filtering
 */
router.get('/', async (req, res, next) => {
  await assessmentController.listAssessments(req, res, next);
});

/**
 * GET /api/v1/assessments/:id
 * Get assessment details and results
 */
router.get('/:id', async (req, res, next) => {
  await assessmentController.getAssessment(req, res, next);
});

/**
 * GET /api/v1/assessments/:id/status
 * Get assessment status and progress
 */
router.get('/:id/status', async (req, res, next) => {
  await assessmentController.getAssessmentStatus(req, res, next);
});

/**
 * DELETE /api/v1/assessments/:id
 * Cancel an active assessment
 */
router.delete('/:id', async (req, res, next) => {
  await assessmentController.cancelAssessment(req, res, next);
});

export default router;
