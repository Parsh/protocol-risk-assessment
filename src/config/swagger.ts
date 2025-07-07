/**
 * Swagger/OpenAPI Configuration
 * Complete API documentation for DeFi Protocol Risk Assessment API
 */

import { Express } from 'express';
import { config } from '../config/environment';

// Using require for CommonJS compatibility
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'DeFi Protocol Risk Assessment API',
    version: '1.0.0',
    description: `
# DeFi Protocol Risk Assessment Microservice

A comprehensive risk assessment API for DeFi protocols that evaluates:
- **Technical Security**: Smart contract vulnerability analysis using Slither
- **Governance Structure**: Token distribution and voting mechanisms
- **Liquidity Metrics**: TVL, volume, and market depth analysis  
- **Developer Reputation**: Team experience and development activity

## Features

✅ **Multi-dimensional Risk Scoring**: Weighted composite scores across 4 categories
✅ **Slither-powered Analysis**: Advanced smart contract vulnerability detection
✅ **Real-time Assessment**: Complete protocol analysis in under 30 seconds
✅ **Production Ready**: Containerized deployment with monitoring
✅ **Demo Safe**: Mock data fallbacks for seamless demonstrations

## Risk Categories

- **Technical (40%)**: Smart contract security vulnerabilities
- **Governance (25%)**: Decentralization and governance risks
- **Liquidity (20%)**: Market liquidity and slippage risks  
- **Reputation (15%)**: Development team and historical track record

## Risk Levels

- **LOW (0-30)**: Minimal risk, well-established protocols
- **MEDIUM (31-60)**: Moderate risk, requires monitoring
- **HIGH (61-80)**: Significant risk, exercise caution
- **CRITICAL (81-100)**: Extreme risk, avoid interaction
    `,
    contact: {
      name: 'API Support',
      email: 'support@defi-risk-assessment.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: config.nodeEnv === 'production' ? 'https://api.defi-risk-assessment.com' : `http://localhost:${config.port}`,
      description: config.nodeEnv === 'production' ? 'Production Server' : 'Development Server'
    }
  ],
  tags: [
    {
      name: 'System',
      description: 'System health and status endpoints'
    },
    {
      name: 'Protocols',
      description: 'Protocol management and registration'
    },
    {
      name: 'Assessments',
      description: 'Risk assessment operations and results'
    }
  ],
  components: {
    schemas: {
      Protocol: {
        type: 'object',
        required: ['name', 'contractAddresses', 'blockchain'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique protocol identifier',
            example: 'protocol-12345'
          },
          name: {
            type: 'string',
            description: 'Protocol name',
            example: 'Uniswap V3'
          },
          contractAddresses: {
            type: 'array',
            items: {
              type: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            description: 'Smart contract addresses',
            example: ['0x1F98431c8aD98523631AE4a59f267346ea31F984']
          },
          blockchain: {
            type: 'string',
            enum: ['ethereum', 'arbitrum', 'optimism'],
            description: 'Blockchain network',
            example: 'ethereum'
          },
          tokenSymbol: {
            type: 'string',
            description: 'Protocol token symbol',
            example: 'UNI'
          },
          website: {
            type: 'string',
            format: 'uri',
            description: 'Protocol website URL',
            example: 'https://uniswap.org'
          },
          documentation: {
            type: 'string',
            format: 'uri',
            description: 'Protocol documentation URL',
            example: 'https://docs.uniswap.org'
          }
        }
      },
      RiskAssessment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Assessment unique identifier',
            example: 'assessment-67890'
          },
          protocolId: {
            type: 'string',
            description: 'Associated protocol ID',
            example: 'protocol-12345'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Assessment creation timestamp',
            example: '2025-07-06T17:00:00.000Z'
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
            description: 'Assessment status',
            example: 'COMPLETED'
          },
          overallScore: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Overall risk score (0-100, higher = more risky)',
            example: 42
          },
          riskLevel: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            description: 'Risk level categorization',
            example: 'MEDIUM'
          },
          categoryScores: {
            type: 'object',
            properties: {
              technical: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Technical security score',
                example: 35
              },
              governance: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Governance structure score',
                example: 45
              },
              liquidity: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Liquidity risk score',
                example: 40
              },
              reputation: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Developer reputation score',
                example: 50
              }
            }
          },
          findings: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Finding'
            },
            description: 'Detailed findings from analysis'
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Risk mitigation recommendations',
            example: [
              'Monitor governance voting patterns',
              'Review smart contract upgrade mechanisms',
              'Assess liquidity pool concentration'
            ]
          },
          metadata: {
            type: 'object',
            properties: {
              analysisVersion: {
                type: 'string',
                example: '1.0.0'
              },
              duration: {
                type: 'number',
                description: 'Analysis duration in seconds',
                example: 5.2
              },
              weights: {
                type: 'object',
                properties: {
                  technical: { type: 'number', example: 0.4 },
                  governance: { type: 'number', example: 0.25 },
                  liquidity: { type: 'number', example: 0.2 },
                  reputation: { type: 'number', example: 0.15 }
                }
              }
            }
          }
        }
      },
      Finding: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Finding type/category',
            example: 'SMART_CONTRACT_VULNERABILITY'
          },
          severity: {
            type: 'string',
            enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
            description: 'Finding severity level',
            example: 'HIGH'
          },
          title: {
            type: 'string',
            description: 'Finding title',
            example: 'Reentrancy Vulnerability Detected'
          },
          description: {
            type: 'string',
            description: 'Detailed finding description',
            example: 'Smart contract contains potential reentrancy vulnerability in withdraw function'
          },
          recommendation: {
            type: 'string',
            description: 'Recommended action',
            example: 'Implement reentrancy guard or checks-effects-interactions pattern'
          },
          source: {
            type: 'string',
            enum: ['technical', 'governance', 'liquidity', 'reputation'],
            description: 'Analysis source that generated this finding',
            example: 'technical'
          }
        }
      },
      AssessmentRequest: {
        type: 'object',
        required: ['protocol'],
        properties: {
          protocol: {
            $ref: '#/components/schemas/Protocol'
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'NORMAL', 'HIGH'],
            description: 'Assessment priority',
            default: 'NORMAL',
            example: 'HIGH'
          },
          analysisDepth: {
            type: 'string',
            enum: ['BASIC', 'STANDARD', 'COMPREHENSIVE'],
            description: 'Depth of analysis to perform',
            default: 'STANDARD',
            example: 'COMPREHENSIVE'
          }
        }
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            example: 'healthy'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-07-06T17:00:00.000Z'
          },
          version: {
            type: 'string',
            example: '1.0.0'
          },
          uptime: {
            type: 'number',
            description: 'Uptime in seconds',
            example: 3600
          },
          environment: {
            type: 'string',
            example: 'production'
          },
          services: {
            type: 'object',
            properties: {
              database: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy'],
                example: 'healthy'
              },
              slither: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy'],
                example: 'healthy'
              },
              externalAPIs: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy'],
                example: 'healthy'
              }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Error message',
            example: 'Protocol not found'
          },
          code: {
            type: 'string',
            description: 'Error code',
            example: 'PROTOCOL_NOT_FOUND'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-07-06T17:00:00.000Z'
          },
          details: {
            type: 'object',
            description: 'Additional error details'
          }
        }
      }
    },
    responses: {
      ValidationError: {
        description: 'Validation Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              timestamp: '2025-07-06T17:00:00.000Z',
              details: {
                field: 'contractAddresses',
                issue: 'Invalid Ethereum address format'
              }
            }
          }
        }
      },
      NotFound: {
        description: 'Resource Not Found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Protocol not found',
              code: 'PROTOCOL_NOT_FOUND',
              timestamp: '2025-07-06T17:00:00.000Z'
            }
          }
        }
      },
      InternalError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Internal server error',
              code: 'INTERNAL_ERROR',
              timestamp: '2025-07-06T17:00:00.000Z'
            }
          }
        }
      }
    }
  }
};

// Options for swagger-jsdoc
const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ]
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Setup Swagger middleware
export const setupSwagger = (app: Express): void => {
  // Serve swagger docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DeFi Risk Assessment API Documentation',
    swaggerOptions: {
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2
    }
  }));

  // Serve swagger JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api/docs');
};

export default swaggerSpec;
