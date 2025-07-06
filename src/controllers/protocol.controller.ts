/**
 * Protocol Controller - Handles CRUD operations for protocols
 * Phase 2 - Stage 2.2: Protocol API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import {
  Protocol,
  ProtocolInput,
  ValidationSchemas,
  ModelFactory,
  ModelUtils,
  TypeGuards,
  ProtocolCategory,
  Blockchain
} from '../models/index';
import { ProtocolRepository } from '../repositories/index';
import { logger } from '../config/logger';

export class ProtocolController {
  constructor(private protocolRepository: ProtocolRepository) {}

  /**
   * Create a new protocol
   * POST /api/v1/protocols
   */
  async createProtocol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Creating new protocol', { body: req.body });

      // Validate input data
      const { error, value } = ValidationSchemas.protocolInput.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
        return;
      }

      const protocolInput: ProtocolInput = value;

      // Check if protocol with same name already exists
      const existingProtocols = await this.protocolRepository.findAll();
      const duplicateName = existingProtocols.find(p => 
        p.name.toLowerCase() === protocolInput.name.toLowerCase()
      );

      if (duplicateName) {
        res.status(409).json({
          success: false,
          message: 'Protocol with this name already exists',
          existingProtocolId: duplicateName.id
        });
        return;
      }

      // Check for duplicate contract addresses
      const duplicateContract = existingProtocols.find(p =>
        p.contractAddresses.some(addr => 
          protocolInput.contractAddresses.some(inputAddr => 
            addr.toLowerCase() === inputAddr.toLowerCase()
          )
        )
      );

      if (duplicateContract) {
        res.status(409).json({
          success: false,
          message: 'Protocol with one or more of these contract addresses already exists',
          existingProtocolId: duplicateContract.id
        });
        return;
      }

      // Create protocol using factory
      const protocol = ModelFactory.createProtocol(protocolInput);

      // Save to repository
      await this.protocolRepository.save(protocol.id, protocol);

      logger.info('Protocol created successfully', { 
        protocolId: protocol.id,
        name: protocol.name 
      });

      res.status(201).json({
        success: true,
        message: 'Protocol created successfully',
        data: {
          protocol: this.formatProtocolResponse(protocol)
        }
      });
    } catch (error) {
      logger.error('Error creating protocol', error);
      next(error);
    }
  }

  /**
   * Get protocol by ID
   * GET /api/v1/protocols/:id
   */
  async getProtocolById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      logger.info('Fetching protocol by ID', { protocolId: id });

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Protocol ID is required'
        });
        return;
      }

      const protocol = await this.protocolRepository.findById(id);

      if (!protocol) {
        res.status(404).json({
          success: false,
          message: 'Protocol not found'
        });
        return;
      }

      logger.info('Protocol found', { protocolId: id, name: protocol.name });

      res.status(200).json({
        success: true,
        data: {
          protocol: this.formatProtocolResponse(protocol)
        }
      });
    } catch (error) {
      logger.error('Error fetching protocol', error);
      next(error);
    }
  }

  /**
   * Get all protocols with optional filtering
   * GET /api/v1/protocols
   */
  async getAllProtocols(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        blockchain, 
        category, 
        search,
        limit = '50',
        offset = '0'
      } = req.query;

      logger.info('Fetching all protocols', { 
        blockchain, 
        category, 
        search, 
        limit, 
        offset 
      });

      // Validate query parameters
      if (blockchain && !TypeGuards.isValidBlockchain(blockchain as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid blockchain parameter',
          validBlockchains: Object.values(Blockchain)
        });
        return;
      }

      if (category && !TypeGuards.isValidProtocolCategory(category as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid category parameter',
          validCategories: Object.values(ProtocolCategory)
        });
        return;
      }

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          message: 'Limit must be a number between 1 and 100'
        });
        return;
      }

      if (isNaN(offsetNum) || offsetNum < 0) {
        res.status(400).json({
          success: false,
          message: 'Offset must be a non-negative number'
        });
        return;
      }

      let protocols = await this.protocolRepository.findAll();

      // Apply filters
      if (blockchain) {
        protocols = protocols.filter(p => p.blockchain === blockchain);
      }

      if (category) {
        protocols = protocols.filter(p => p.category === category);
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        protocols = protocols.filter(p => 
          p.name.toLowerCase().includes(searchTerm) ||
          p.description?.toLowerCase().includes(searchTerm) ||
          p.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Apply pagination
      const total = protocols.length;
      const paginatedProtocols = protocols.slice(offsetNum, offsetNum + limitNum);

      logger.info('Protocols fetched successfully', { 
        total,
        returned: paginatedProtocols.length,
        filters: { blockchain, category, search }
      });

      res.status(200).json({
        success: true,
        data: {
          protocols: paginatedProtocols.map(p => this.formatProtocolResponse(p)),
          pagination: {
            total,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < total
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching protocols', error);
      next(error);
    }
  }

  /**
   * Update protocol by ID
   * PUT /api/v1/protocols/:id
   */
  async updateProtocol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      logger.info('Updating protocol', { protocolId: id, body: req.body });

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Protocol ID is required'
        });
        return;
      }

      // Validate update data
      const { error, value } = ValidationSchemas.protocolUpdate.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
        return;
      }

      // Check if protocol exists
      const existingProtocol = await this.protocolRepository.findById(id);
      if (!existingProtocol) {
        res.status(404).json({
          success: false,
          message: 'Protocol not found'
        });
        return;
      }

      // Check for name conflicts (if name is being updated)
      if (value.name && value.name !== existingProtocol.name) {
        const allProtocols = await this.protocolRepository.findAll();
        const duplicateName = allProtocols.find(p => 
          p.id !== id && p.name.toLowerCase() === value.name!.toLowerCase()
        );

        if (duplicateName) {
          res.status(409).json({
            success: false,
            message: 'Protocol with this name already exists',
            existingProtocolId: duplicateName.id
          });
          return;
        }
      }

      // Check for contract address conflicts (if contract addresses are being updated)
      if (value.contractAddresses) {
        const allProtocols = await this.protocolRepository.findAll();
        const duplicateContract = allProtocols.find(p =>
          p.id !== id &&
          p.contractAddresses.some(addr => 
            value.contractAddresses!.some(inputAddr => 
              addr.toLowerCase() === inputAddr.toLowerCase()
            )
          )
        );

        if (duplicateContract) {
          res.status(409).json({
            success: false,
            message: 'Protocol with one or more of these contract addresses already exists',
            existingProtocolId: duplicateContract.id
          });
          return;
        }
      }

      // Update protocol
      const updatedProtocol = ModelUtils.updateEntityTimestamp({
        ...existingProtocol,
        ...value
      });

      await this.protocolRepository.save(id, updatedProtocol);

      logger.info('Protocol updated successfully', { 
        protocolId: id,
        updatedFields: Object.keys(value)
      });

      res.status(200).json({
        success: true,
        message: 'Protocol updated successfully',
        data: {
          protocol: this.formatProtocolResponse(updatedProtocol)
        }
      });
    } catch (error) {
      logger.error('Error updating protocol', error);
      next(error);
    }
  }

  /**
   * Delete protocol by ID
   * DELETE /api/v1/protocols/:id
   */
  async deleteProtocol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      logger.info('Deleting protocol', { protocolId: id });

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Protocol ID is required'
        });
        return;
      }

      // Check if protocol exists
      const existingProtocol = await this.protocolRepository.findById(id);
      if (!existingProtocol) {
        res.status(404).json({
          success: false,
          message: 'Protocol not found'
        });
        return;
      }

      // TODO: Check if there are any active assessments for this protocol
      // For now, we'll allow deletion, but in production you might want to prevent
      // deletion of protocols with active or completed assessments

      await this.protocolRepository.delete(id);

      logger.info('Protocol deleted successfully', { 
        protocolId: id,
        name: existingProtocol.name
      });

      res.status(200).json({
        success: true,
        message: 'Protocol deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting protocol', error);
      next(error);
    }
  }

  /**
   * Get protocol statistics
   * GET /api/v1/protocols/stats
   */
  async getProtocolStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Fetching protocol statistics');

      const protocols = await this.protocolRepository.findAll();

      const stats = {
        total: protocols.length,
        byBlockchain: this.groupBy(protocols, 'blockchain'),
        byCategory: this.groupBy(protocols, 'category'),
        recentlyAdded: protocols
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map(p => ({
            id: p.id,
            name: p.name,
            blockchain: p.blockchain,
            category: p.category,
            createdAt: p.createdAt
          }))
      };

      logger.info('Protocol statistics compiled', { 
        totalProtocols: stats.total,
        blockchains: Object.keys(stats.byBlockchain).length,
        categories: Object.keys(stats.byCategory).length
      });

      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Error fetching protocol statistics', error);
      next(error);
    }
  }

  /**
   * Format protocol response for API output
   */
  private formatProtocolResponse(protocol: Protocol) {
    return {
      id: protocol.id,
      name: protocol.name,
      contractAddresses: protocol.contractAddresses,
      blockchain: protocol.blockchain,
      tokenSymbol: protocol.tokenSymbol,
      website: protocol.website,
      documentation: protocol.documentation,
      description: protocol.description,
      category: protocol.category,
      tags: protocol.tags,
      createdAt: protocol.createdAt,
      updatedAt: protocol.updatedAt
    };
  }

  /**
   * Group array items by a property
   */
  private groupBy(array: any[], property: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = item[property] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}
