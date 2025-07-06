/**
 * Assessment Routes
 * REST API routes for assessment management
 * Stage 3.2: Assessment API implementation
 */

import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/assessments:
 *   post:
 *     tags:
 *       - Assessments
 *     summary: Initiate risk assessment
 *     description: Start a comprehensive risk assessment for a DeFi protocol
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssessmentRequest'
 *           example:
 *             protocol:
 *               name: "Compound V3"
 *               contractAddresses: ["0xc3d688B66703497DAA19211EEdff47f25384cdc3"]
 *               blockchain: "ethereum"
 *               tokenSymbol: "COMP"
 *               website: "https://compound.finance"
 *             priority: "HIGH"
 *             analysisDepth: "COMPREHENSIVE"
 *     responses:
 *       201:
 *         description: Assessment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Assessment initiated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     assessmentId:
 *                       type: string
 *                       example: "assessment-67890"
 *                     status:
 *                       type: string
 *                       example: "PENDING"
 *                     estimatedCompletionTime:
 *                       type: number
 *                       example: 30
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   get:
 *     tags:
 *       - Assessments
 *     summary: List assessments
 *     description: Retrieve a list of assessments with optional filtering
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter by assessment status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED]
 *       - name: riskLevel
 *         in: query
 *         description: Filter by risk level
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *       - name: limit
 *         in: query
 *         description: Number of results to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: offset
 *         in: query
 *         description: Number of results to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: List of assessments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RiskAssessment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     offset:
 *                       type: integer
 *                       example: 0
 */
router.post('/', async (req, res, next) => {
  await assessmentController.createAssessment(req, res, next);
});

router.get('/', async (req, res, next) => {
  await assessmentController.listAssessments(req, res, next);
});

/**
 * @swagger
 * /api/v1/assessments/{id}:
 *   get:
 *     tags:
 *       - Assessments
 *     summary: Get assessment details
 *     description: Retrieve complete assessment results including risk scores and findings
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Assessment ID
 *         schema:
 *           type: string
 *           example: "assessment-67890"
 *     responses:
 *       200:
 *         description: Assessment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RiskAssessment'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:id', async (req, res, next) => {
  await assessmentController.getAssessment(req, res, next);
});

/**
 * @swagger
 * /api/v1/assessments/{id}/status:
 *   get:
 *     tags:
 *       - Assessments
 *     summary: Get assessment status
 *     description: Check the current status and progress of an assessment
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Assessment ID
 *         schema:
 *           type: string
 *           example: "assessment-67890"
 *     responses:
 *       200:
 *         description: Assessment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "assessment-67890"
 *                     status:
 *                       type: string
 *                       example: "IN_PROGRESS"
 *                     progress:
 *                       type: number
 *                       example: 75
 *                     estimatedTimeRemaining:
 *                       type: number
 *                       example: 8
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
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
