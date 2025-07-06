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
 * @route   POST /api/v1/protocols
 * @desc    Create a new protocol
 * @access  Public (should be authenticated in production)
 */
router.post('/', 
  validateRequest(ValidationSchemas.protocolInput),
  protocolController.createProtocol.bind(protocolController)
);

/**
 * @route   GET /api/v1/protocols/stats
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
