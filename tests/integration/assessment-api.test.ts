/**
 * Assessment API Integration Tests
 * Testing Stage 3.2: Assessment API implementation
 */

import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';
import { dataDirectoryService } from '../../src/services/data-directory.service';

describe('Assessment API Integration Tests', () => {
  let app: Application;

  beforeAll(async () => {
    // Initialize data directory
    await dataDirectoryService.initialize();
    
    // Create Express app
    app = createApp();
  });

  describe('POST /api/v1/assessments', () => {
    test('should create new assessment with protocol data', async () => {
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'TestDEX',
            contractAddresses: ['0x1234567890123456789012345678901234567890'],
            blockchain: 'ethereum',
            tokenSymbol: 'TDX',
            website: 'https://testdex.com',
            category: 'DEX'
          },
          priority: 'HIGH',
          analysisDepth: 'STANDARD'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        status: 'PENDING',
        estimatedCompletionTime: 90,
        message: 'Assessment initiated successfully'
      });
      expect(response.body.data.assessmentId).toMatch(/^assessment-\d+-[a-f0-9]+$/);
      expect(response.body.data.protocolId).toBeDefined();
    });

    test('should create assessment with minimal protocol data', async () => {
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'MinimalDEX',
            contractAddresses: ['0x1234567890123456789012345678901234567891'],
            blockchain: 'ethereum'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('PENDING');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'TestDEX'
            // Missing contractAddresses and blockchain
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    test('should validate contract addresses format', async () => {
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'TestDEX',
            contractAddresses: ['invalid-address'],
            blockchain: 'ethereum'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should require either protocolId or protocol data', async () => {
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          priority: 'HIGH'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/assessments/:id/status', () => {
    let testAssessmentId: string;

    beforeEach(async () => {
      // Create a test assessment
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'StatusTestDEX',
            contractAddresses: ['0x1234567890123456789012345678901234567892'],
            blockchain: 'ethereum'
          }
        });

      testAssessmentId = response.body.data.assessmentId;
    });

    test('should get assessment status', async () => {
      const response = await request(app)
        .get(`/api/v1/assessments/${testAssessmentId}/status`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        assessmentId: testAssessmentId,
        progress: expect.any(Number),
        startedAt: expect.any(String)
      });
      expect(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).toContain(response.body.data.status);
    });

    test('should return 404 for non-existent assessment', async () => {
      const response = await request(app)
        .get('/api/v1/assessments/non-existent-id/status');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Assessment not found');
    });

    test('should validate assessment ID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/assessments/ /status'); // Invalid ID with space

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Assessment not found');
    });
  });

  describe('GET /api/v1/assessments/:id', () => {
    let testAssessmentId: string;

    beforeEach(async () => {
      // Create a test assessment
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'ResultTestDEX',
            contractAddresses: ['0x1234567890123456789012345678901234567893'],
            blockchain: 'ethereum'
          }
        });

      testAssessmentId = response.body.data.assessmentId;
    });

    test('should return 400 for incomplete assessment', async () => {
      const response = await request(app)
        .get(`/api/v1/assessments/${testAssessmentId}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Assessment not completed yet');
      expect(response.body.message).toBe('Use /status endpoint to check progress');
    });

    test('should return 404 for non-existent assessment', async () => {
      const response = await request(app)
        .get('/api/v1/assessments/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Assessment not found');
    });
  });

  describe('GET /api/v1/assessments', () => {
    beforeEach(async () => {
      // Create a few test assessments
      await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'ListTestDEX1',
            contractAddresses: ['0x1234567890123456789012345678901234567894'],
            blockchain: 'ethereum'
          }
        });

      await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'ListTestDEX2',
            contractAddresses: ['0x1234567890123456789012345678901234567895'],
            blockchain: 'polygon'
          }
        });
    });

    test('should list all assessments', async () => {
      const response = await request(app)
        .get('/api/v1/assessments');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assessments).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(0);
      expect(response.body.data.limit).toBe(20); // Default limit
      expect(response.body.data.offset).toBe(0); // Default offset
    });

    test('should apply pagination', async () => {
      const response = await request(app)
        .get('/api/v1/assessments?limit=5&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(5);
      expect(response.body.data.offset).toBe(0);
      expect(response.body.data.assessments.length).toBeLessThanOrEqual(5);
    });

    test('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/assessments?limit=150'); // Exceeds max limit

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Limit must be between 1 and 100');
    });

    test('should validate negative offset', async () => {
      const response = await request(app)
        .get('/api/v1/assessments?offset=-1');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/assessments?status=PENDING');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned assessments should have PENDING status
      response.body.data.assessments.forEach((assessment: any) => {
        expect(assessment.status).toBe('PENDING');
      });
    });
  });

  describe('DELETE /api/v1/assessments/:id', () => {
    let testAssessmentId: string;

    beforeEach(async () => {
      // Create a test assessment
      const response = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'CancelTestDEX',
            contractAddresses: ['0x1234567890123456789012345678901234567896'],
            blockchain: 'ethereum'
          }
        });

      testAssessmentId = response.body.data.assessmentId;
    });

    test('should cancel active assessment', async () => {
      const response = await request(app)
        .delete(`/api/v1/assessments/${testAssessmentId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Assessment cancelled successfully');
      expect(response.body.assessmentId).toBe(testAssessmentId);
    });

    test('should return 404 for non-existent assessment', async () => {
      const response = await request(app)
        .delete('/api/v1/assessments/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Assessment not found or not active');
    });
  });

  describe('Assessment workflow', () => {
    test('should handle complete assessment lifecycle', async () => {
      // Step 1: Create assessment
      const createResponse = await request(app)
        .post('/api/v1/assessments')
        .send({
          protocol: {
            name: 'WorkflowTestDEX',
            contractAddresses: ['0x1234567890123456789012345678901234567897'],
            blockchain: 'ethereum'
          },
          analysisDepth: 'BASIC'
        });

      expect(createResponse.status).toBe(201);
      const assessmentId = createResponse.body.data.assessmentId;

      // Step 2: Check status
      const statusResponse = await request(app)
        .get(`/api/v1/assessments/${assessmentId}/status`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.assessmentId).toBe(assessmentId);

      // Step 3: Try to get results (should fail for incomplete assessment)
      const resultsResponse = await request(app)
        .get(`/api/v1/assessments/${assessmentId}`);

      expect(resultsResponse.status).toBe(400);
      expect(resultsResponse.body.error).toBe('Assessment not completed yet');

      // Step 4: Cancel assessment
      const cancelResponse = await request(app)
        .delete(`/api/v1/assessments/${assessmentId}`);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
    });
  });
});
