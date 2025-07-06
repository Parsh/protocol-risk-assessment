# API Reference Guide

## Table of Contents
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Health API](#health-api)
- [Protocol API](#protocol-api)
- [Assessment API](#assessment-api)
- [Webhooks](#webhooks)
- [SDK Examples](#sdk-examples)

## Authentication

The API supports multiple authentication methods:

### API Key Authentication (Recommended)

Include your API key in the request header:

```http
X-API-Key: your-api-key-here
```

Example:
```bash
curl -H "X-API-Key: abc123def456" \
  http://localhost:3000/api/v1/protocols
```

### JWT Authentication

For web applications, use JWT tokens:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Example:
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/assessments
```

### No Authentication (Development)

In development mode, authentication is optional for testing.

## Rate Limiting

### Default Limits
- **Window**: 15 minutes (900 seconds)
- **Requests**: 100 per window per IP
- **Burst**: 10 requests per second

### Headers
Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "window": "15 minutes",
      "retryAfter": 120
    }
  }
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123",
    "version": "1.0.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "contractAddress",
      "value": "invalid-address",
      "expected": "Valid Ethereum address"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123",
    "version": "1.0.0"
  }
}
```

### Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Description | Example |
|------|-------------|---------|
| 200 | Success | Data retrieved successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | External service unavailable |
| 503 | Service Unavailable | Service temporarily down |

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_ERROR` | Authentication failed | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `EXTERNAL_API_ERROR` | External service error | 502 |
| `SERVICE_UNAVAILABLE` | Service temporarily down | 503 |
| `INTERNAL_ERROR` | Unexpected server error | 500 |

## Health API

### Check Service Health

```http
GET /api/v1/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 5
      },
      "ethereum_rpc": {
        "status": "healthy",
        "responseTime": 120,
        "blockNumber": 18500000
      },
      "external_apis": {
        "etherscan": "healthy",
        "coingecko": "healthy",
        "defillama": "healthy"
      }
    },
    "metrics": {
      "totalAssessments": 1250,
      "activeAssessments": 3,
      "avgResponseTime": 250,
      "errorRate": 0.02
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/v1/health
```

## Protocol API

### List Protocols

```http
GET /api/v1/protocols
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search protocols by name
- `chain` (string): Filter by blockchain (ethereum, polygon, bsc)
- `category` (string): Filter by protocol category
- `sort` (string): Sort field (name, createdAt, updatedAt)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uniswap-v3",
      "name": "Uniswap V3",
      "description": "Decentralized exchange with concentrated liquidity",
      "category": "dex",
      "chain": "ethereum",
      "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      "website": "https://uniswap.org",
      "documentation": "https://docs.uniswap.org",
      "github": "https://github.com/Uniswap/v3-core",
      "tvl": 1500000000,
      "volume24h": 50000000,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "riskScore": 0.25,
      "lastAssessment": "2024-01-14T15:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Examples:**
```bash
# List all protocols
curl http://localhost:3000/api/v1/protocols

# Search protocols
curl "http://localhost:3000/api/v1/protocols?search=uniswap"

# Filter by chain
curl "http://localhost:3000/api/v1/protocols?chain=ethereum&limit=10"

# Sort by TVL
curl "http://localhost:3000/api/v1/protocols?sort=tvl&order=desc"
```

### Get Protocol by ID

```http
GET /api/v1/protocols/{id}
```

**Path Parameters:**
- `id` (string): Protocol identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uniswap-v3",
    "name": "Uniswap V3",
    "description": "Decentralized exchange with concentrated liquidity",
    "category": "dex",
    "chain": "ethereum",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "abi": [...],
    "website": "https://uniswap.org",
    "documentation": "https://docs.uniswap.org",
    "github": "https://github.com/Uniswap/v3-core",
    "tvl": 1500000000,
    "volume24h": 50000000,
    "tokens": [
      {
        "address": "0xA0b86a33E6441b4D9e60516e1e3b4C0C3e1f4F3f",
        "symbol": "ETH",
        "name": "Ethereum",
        "decimals": 18
      }
    ],
    "pools": [
      {
        "address": "0x...",
        "token0": "0x...",
        "token1": "0x...",
        "fee": 3000,
        "liquidity": "1000000000000000000"
      }
    ],
    "assessments": [
      {
        "id": "assessment-123",
        "createdAt": "2024-01-14T15:20:00Z",
        "status": "completed",
        "riskScore": 0.25
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/v1/protocols/uniswap-v3
```

### Create Protocol

```http
POST /api/v1/protocols
```

**Request Body:**
```json
{
  "id": "new-protocol",
  "name": "New DeFi Protocol",
  "description": "A revolutionary DeFi protocol",
  "category": "lending",
  "chain": "ethereum",
  "contractAddress": "0x1234567890123456789012345678901234567890",
  "website": "https://example.com",
  "documentation": "https://docs.example.com",
  "github": "https://github.com/example/protocol"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-protocol",
    "name": "New DeFi Protocol",
    // ... full protocol object
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "Content-Type: application/json" \
  -d '{
    "id": "example-protocol",
    "name": "Example Protocol",
    "contractAddress": "0x1234567890123456789012345678901234567890",
    "chain": "ethereum"
  }'
```

### Update Protocol

```http
PUT /api/v1/protocols/{id}
```

**Path Parameters:**
- `id` (string): Protocol identifier

**Request Body:**
```json
{
  "name": "Updated Protocol Name",
  "description": "Updated description",
  "website": "https://newwebsite.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated protocol object
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Delete Protocol

```http
DELETE /api/v1/protocols/{id}
```

**Path Parameters:**
- `id` (string): Protocol identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Protocol deleted successfully",
    "deletedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Assessment API

### List Assessments

```http
GET /api/v1/assessments
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `protocolId` (string): Filter by protocol ID
- `status` (string): Filter by status (pending, running, completed, failed)
- `riskLevel` (string): Filter by risk level (low, medium, high, critical)
- `dateFrom` (string): Filter assessments from date (ISO 8601)
- `dateTo` (string): Filter assessments to date (ISO 8601)
- `sort` (string): Sort field (createdAt, updatedAt, riskScore)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assessment-abc123",
      "protocolId": "uniswap-v3",
      "protocolName": "Uniswap V3",
      "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      "chainId": 1,
      "status": "completed",
      "analysisTypes": ["contract", "liquidity", "market", "security"],
      "riskScore": 0.25,
      "riskLevel": "low",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:30:00Z",
      "duration": 1800,
      "summary": {
        "contractRisk": 0.20,
        "liquidityRisk": 0.15,
        "marketRisk": 0.30,
        "securityRisk": 0.35
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Examples:**
```bash
# List all assessments
curl http://localhost:3000/api/v1/assessments

# Filter by protocol
curl "http://localhost:3000/api/v1/assessments?protocolId=uniswap-v3"

# Filter by status
curl "http://localhost:3000/api/v1/assessments?status=completed"

# Filter by date range
curl "http://localhost:3000/api/v1/assessments?dateFrom=2024-01-01&dateTo=2024-01-15"
```

### Get Assessment by ID

```http
GET /api/v1/assessments/{id}
```

**Path Parameters:**
- `id` (string): Assessment identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assessment-abc123",
    "protocolId": "uniswap-v3",
    "protocolName": "Uniswap V3",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "chainId": 1,
    "status": "completed",
    "analysisTypes": ["contract", "liquidity", "market", "security"],
    "riskScore": 0.25,
    "riskLevel": "low",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:30:00Z",
    "duration": 1800,
    "results": {
      "contract": {
        "score": 0.20,
        "level": "low",
        "findings": [
          {
            "type": "info",
            "title": "Standard ERC-20 Implementation",
            "description": "Contract follows standard ERC-20 patterns",
            "severity": "info",
            "confidence": "high"
          }
        ],
        "metrics": {
          "complexity": 0.15,
          "auditCoverage": 0.95,
          "upgradeability": false,
          "pausability": true
        }
      },
      "liquidity": {
        "score": 0.15,
        "level": "low",
        "metrics": {
          "totalLiquidity": 1500000000,
          "liquidityConcentration": 0.25,
          "avgTradingVolume": 50000000,
          "priceImpact": 0.02,
          "slippage": 0.01
        }
      },
      "market": {
        "score": 0.30,
        "level": "medium",
        "metrics": {
          "marketCap": 5000000000,
          "volatility": 0.45,
          "correlation": 0.85,
          "liquidityRatio": 0.30,
          "tradingVolume": 100000000
        }
      },
      "security": {
        "score": 0.35,
        "level": "medium",
        "findings": [
          {
            "type": "warning",
            "title": "Centralized Ownership",
            "description": "Contract has single owner with significant privileges",
            "severity": "medium",
            "confidence": "high",
            "impact": "medium"
          }
        ],
        "audits": [
          {
            "auditor": "Trail of Bits",
            "date": "2023-06-15",
            "report": "https://example.com/audit-report.pdf",
            "findings": 3,
            "severity": "medium"
          }
        ]
      }
    },
    "recommendations": [
      {
        "category": "security",
        "priority": "high",
        "title": "Implement Multi-sig Governance",
        "description": "Replace single owner with multi-signature wallet for critical functions"
      },
      {
        "category": "liquidity",
        "priority": "medium",
        "title": "Diversify Liquidity Pools",
        "description": "Encourage liquidity distribution across multiple pools"
      }
    ],
    "metadata": {
      "analysisVersion": "1.0.0",
      "dataVersion": "2024-01-15",
      "externalSources": [
        "etherscan",
        "coingecko",
        "defillama"
      ]
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/v1/assessments/assessment-abc123
```

### Create Assessment

```http
POST /api/v1/assessments
```

**Request Body:**
```json
{
  "protocolId": "uniswap-v3",
  "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  "chainId": 1,
  "analysisTypes": ["contract", "liquidity", "market", "security"],
  "options": {
    "includeHistoricalData": true,
    "analysisDepth": "comprehensive",
    "customWeights": {
      "contract": 0.3,
      "liquidity": 0.2,
      "market": 0.2,
      "security": 0.3
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assessment-abc123",
    "protocolId": "uniswap-v3",
    "status": "pending",
    "estimatedDuration": 1800,
    "createdAt": "2024-01-15T10:00:00Z",
    "analysisTypes": ["contract", "liquidity", "market", "security"]
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "uniswap-v3",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "chainId": 1,
    "analysisTypes": ["contract", "liquidity", "market", "security"]
  }'
```

### Delete Assessment

```http
DELETE /api/v1/assessments/{id}
```

**Path Parameters:**
- `id` (string): Assessment identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Assessment deleted successfully",
    "deletedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Webhooks

### Configure Webhooks

You can configure webhooks to receive real-time notifications about assessment progress and completion.

**Webhook URL Configuration:**
```bash
# Set webhook URL in environment
WEBHOOK_URL=https://your-app.com/webhooks/risk-assessment
```

### Webhook Events

#### Assessment Started
```json
{
  "event": "assessment.started",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "id": "assessment-abc123",
    "protocolId": "uniswap-v3",
    "status": "running",
    "estimatedDuration": 1800
  }
}
```

#### Assessment Progress
```json
{
  "event": "assessment.progress",
  "timestamp": "2024-01-15T10:15:00Z",
  "data": {
    "id": "assessment-abc123",
    "status": "running",
    "progress": 0.5,
    "currentPhase": "liquidity-analysis",
    "completedPhases": ["contract-analysis"]
  }
}
```

#### Assessment Completed
```json
{
  "event": "assessment.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "assessment-abc123",
    "status": "completed",
    "riskScore": 0.25,
    "riskLevel": "low",
    "duration": 1800,
    "resultsUrl": "https://api.example.com/api/v1/assessments/assessment-abc123"
  }
}
```

#### Assessment Failed
```json
{
  "event": "assessment.failed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "assessment-abc123",
    "status": "failed",
    "error": {
      "code": "RPC_CONNECTION_ERROR",
      "message": "Unable to connect to Ethereum RPC endpoint"
    }
  }
}
```

### Webhook Security

Webhooks include a signature header for verification:

```http
X-Webhook-Signature: sha256=1234567890abcdef...
```

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

## SDK Examples

### JavaScript/TypeScript

```javascript
// Install: npm install @defi-risk/assessment-sdk

import { RiskAssessmentClient } from '@defi-risk/assessment-sdk';

const client = new RiskAssessmentClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Create assessment
const assessment = await client.assessments.create({
  protocolId: 'uniswap-v3',
  contractAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  chainId: 1,
  analysisTypes: ['contract', 'liquidity', 'market', 'security']
});

console.log('Assessment created:', assessment.id);

// Poll for completion
const completed = await client.assessments.waitForCompletion(assessment.id);
console.log('Risk score:', completed.riskScore);

// Get results
const results = await client.assessments.get(assessment.id);
console.log('Detailed results:', results.results);
```

### Python

```python
# Install: pip install defi-risk-assessment

from defi_risk import RiskAssessmentClient

client = RiskAssessmentClient(
    api_key='your-api-key',
    base_url='https://api.example.com'
)

# Create assessment
assessment = client.assessments.create(
    protocol_id='uniswap-v3',
    contract_address='0x1F98431c8aD98523631AE4a59f267346ea31F984',
    chain_id=1,
    analysis_types=['contract', 'liquidity', 'market', 'security']
)

print(f"Assessment created: {assessment.id}")

# Wait for completion
completed = client.assessments.wait_for_completion(assessment.id)
print(f"Risk score: {completed.risk_score}")

# Get detailed results
results = client.assessments.get(assessment.id)
print(f"Contract risk: {results.results.contract.score}")
```

### cURL Scripts

**Create and Monitor Assessment:**
```bash
#!/bin/bash

API_KEY="your-api-key"
BASE_URL="http://localhost:3000"

# Create assessment
echo "Creating assessment..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/assessments" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "uniswap-v3",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "chainId": 1,
    "analysisTypes": ["contract", "liquidity", "market", "security"]
  }')

ASSESSMENT_ID=$(echo $RESPONSE | jq -r '.data.id')
echo "Assessment ID: $ASSESSMENT_ID"

# Poll for completion
echo "Waiting for completion..."
while true; do
  STATUS=$(curl -s "$BASE_URL/api/v1/assessments/$ASSESSMENT_ID" \
    -H "X-API-Key: $API_KEY" | jq -r '.data.status')
  
  if [ "$STATUS" = "completed" ]; then
    echo "Assessment completed!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Assessment failed!"
    break
  else
    echo "Status: $STATUS"
    sleep 10
  fi
done

# Get results
echo "Getting results..."
curl -s "$BASE_URL/api/v1/assessments/$ASSESSMENT_ID" \
  -H "X-API-Key: $API_KEY" | jq '.data'
```

---

## Interactive API Explorer

For real-time API testing, visit the interactive Swagger UI:

**Local Development:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

**Production:** [https://your-domain.com/api-docs](https://your-domain.com/api-docs)

The interactive explorer allows you to:
- Test all API endpoints
- View request/response schemas
- Try different parameters
- Generate code examples
- Download OpenAPI specification
