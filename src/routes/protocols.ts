/**
 * Protocol routes - API endpoints for protocol management
 * Phase 2 - Stage 2.2: Protocol API Implementation
 */

import { Router } from 'express';
import { ProtocolController } from '../controllers/protocol.controller';
import { protocolRepository } from '../repositories/index';
import { validateRequest } from '../middleware/validation';
import { ValidationSchemas } from '../models/index';

const router = Router();
console.log('📋 Protocol router initialized');

// Create protocol controller instance
const protocolController = new ProtocolController(protocolRepository);
console.log('🎮 Protocol controller initialized');

/**
 * @swagger
 * /api/v1/protocols:
 *   post:
 *     tags:
 *       - Protocols
 *     summary: Register a new protocol
 *     description: Register a new DeFi protocol for risk assessment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Protocol'
 *           example:
 *             name: "Uniswap V3"
 *             contractAddresses: ["0x1F98431c8aD98523631AE4a59f267346ea31F984"]
 *             blockchain: "ethereum"
 *             tokenSymbol: "UNI"
 *             website: "https://uniswap.org"
 *             documentation: "https://docs.uniswap.org"
 *     responses:
 *       201:
 *         description: Protocol created successfully
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
 *                   example: "Protocol created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Protocol'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/', 
  validateRequest(ValidationSchemas.protocolInput),
  protocolController.createProtocol.bind(protocolController)
);

/**
 * @swagger
 * /api/v1/protocols/stats:
 * @desc    Get protocol statistics
 * @access  Public
 */
router.get('/stats', 
  protocolController.getProtocolStats.bind(protocolController)
);

/**
 * @route   GET /api/v1/protocols/:id
 * @desc    Get protocol by ID
 * @access  Public
 */
router.get('/:id', 
  protocolController.getProtocolById.bind(protocolController)
);

/**
 * @route   GET /api/v1/protocols
 * @desc    Get all protocols with optional filtering
 * @access  Public
 */
router.get('/', 
  protocolController.getAllProtocols.bind(protocolController)
);

/**
 * @route   PUT /api/v1/protocols/:id
 * @desc    Update protocol by ID
 * @access  Public (should be authenticated in production)
 */
router.put('/:id', 
  validateRequest(ValidationSchemas.protocolUpdate),
  protocolController.updateProtocol.bind(protocolController)
);

/**
 * @route   DELETE /api/v1/protocols/:id
 * @desc    Delete protocol by ID
 * @access  Public (should be authenticated in production)
 */
router.delete('/:id', 
  protocolController.deleteProtocol.bind(protocolController)
);

console.log('🚀 All protocol routes registered:');
console.log('  POST /', 'createProtocol');
console.log('  GET /stats', 'getProtocolStats');  
console.log('  GET /:id', 'getProtocolById');
console.log('  GET /', 'getAllProtocols');
console.log('  PUT /:id', 'updateProtocol');
console.log('  DELETE /:id', 'deleteProtocol');

export default router;
