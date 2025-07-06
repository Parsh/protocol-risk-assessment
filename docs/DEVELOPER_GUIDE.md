# DeFi Protocol Risk Assessment - Developer Setup Guide

## Table of Contents
- [Quick Start](#quick-start)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [Debugging](#debugging)

## Quick Start

### Prerequisites
- Node.js v18+ 
- npm v8+
- Git
- VS Code (recommended)

### Setup
```bash
# Clone repository
git clone <repository-url>
cd protocol-risk-assessment

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your RPC URLs and API keys

# Start development server
npm run dev

# In another terminal, run tests
npm test

# View API documentation
open http://localhost:3000/api-docs
```

## Development Environment

### Required Tools
- **Node.js**: v18.0.0+ (use nvm for version management)
- **npm**: v8.0.0+ (comes with Node.js)
- **Git**: Latest version
- **Docker**: For testing production builds (optional)

### Recommended Tools
- **VS Code**: With these extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Jest Runner
  - REST Client
  - Docker (if using containers)

### VS Code Configuration

Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/.git": true
  }
}
```

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Environment Configuration

Copy and configure your development environment:

```bash
cp .env.example .env
```

**Development .env example:**
```env
# Development settings
NODE_ENV=development
PORT=3000
HOST=localhost
LOG_LEVEL=debug

# Required: Get free RPC endpoint from public providers
ETHEREUM_RPC_URL=https://eth.public-rpc.com
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Optional: API keys for enhanced features
ETHERSCAN_API_KEY=YourEtherscanKey
COINGECKO_API_KEY=YourCoinGeckoKey

# Development security (use simple values)
JWT_SECRET=dev-jwt-secret-key
API_KEY_SECRET=dev-api-key-secret

# Development paths
DATA_PATH=./data

# Relaxed rate limiting for development
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
```

## Project Structure

```
protocol-risk-assessment/
├── src/                           # Source code
│   ├── analyzers/                 # Risk analysis modules
│   │   ├── contract-analyzer.ts   # Smart contract analysis
│   │   ├── liquidity-analyzer.ts  # Liquidity risk analysis
│   │   ├── market-analyzer.ts     # Market risk analysis
│   │   └── security-analyzer.ts   # Security risk analysis
│   ├── config/                    # Configuration modules
│   │   ├── environment.ts         # Environment variables
│   │   ├── logger.ts              # Logging configuration
│   │   ├── production.ts          # Production settings
│   │   └── swagger.ts             # API documentation
│   ├── controllers/               # Route controllers
│   │   ├── assessment.controller.ts
│   │   ├── health.controller.ts
│   │   └── protocol.controller.ts
│   ├── middleware/                # Express middleware
│   │   ├── auth.ts                # Authentication
│   │   ├── error-handler.ts       # Error handling
│   │   ├── logging.ts             # Request logging
│   │   ├── monitoring.ts          # Production monitoring
│   │   ├── not-found.ts           # 404 handler
│   │   ├── rate-limiter.ts        # Rate limiting
│   │   └── validation.ts          # Input validation
│   ├── models/                    # Data models
│   │   ├── assessment.model.ts    # Risk assessment
│   │   ├── protocol.model.ts      # Protocol definition
│   │   └── risk-metrics.model.ts  # Risk metrics
│   ├── repositories/              # Data access layer
│   │   ├── assessment.repository.ts
│   │   ├── cache.repository.ts
│   │   └── protocol.repository.ts
│   ├── routes/                    # API routes
│   │   ├── assessments.ts         # Assessment endpoints
│   │   ├── health.ts              # Health check
│   │   └── protocols.ts           # Protocol endpoints
│   ├── services/                  # Business logic
│   │   ├── assessment.service.ts  # Assessment orchestration
│   │   ├── cache.service.ts       # Caching logic
│   │   ├── external-api.service.ts # External API calls
│   │   └── protocol.service.ts    # Protocol management
│   ├── utils/                     # Utility functions
│   │   ├── blockchain.utils.ts    # Blockchain helpers
│   │   ├── crypto.utils.ts        # Cryptographic utilities
│   │   ├── file.utils.ts          # File operations
│   │   ├── http.utils.ts          # HTTP helpers
│   │   ├── math.utils.ts          # Mathematical functions
│   │   └── validation.utils.ts    # Validation helpers
│   ├── app.ts                     # Express app configuration
│   └── index.ts                   # Application entry point
├── tests/                         # Test files
│   ├── integration/               # Integration tests
│   ├── unit/                      # Unit tests
│   ├── mock-data.factory.ts       # Test data factory
│   └── setup.ts                   # Test configuration
├── data/                          # Application data
├── docker/                        # Docker configurations
├── scripts/                       # Deployment scripts
└── docs/                          # Documentation
```

### Key Directories

- **`src/analyzers/`**: Core risk analysis logic
- **`src/services/`**: Business logic and orchestration
- **`src/controllers/`**: HTTP request handlers
- **`src/routes/`**: API endpoint definitions
- **`src/models/`**: TypeScript interfaces and types
- **`src/utils/`**: Reusable helper functions

## API Documentation

### Interactive Documentation

Access Swagger UI at: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### API Endpoints

#### Health Check
```http
GET /api/v1/health
```

#### Protocols
```http
GET    /api/v1/protocols           # List all protocols
POST   /api/v1/protocols           # Create new protocol
GET    /api/v1/protocols/:id       # Get protocol by ID
PUT    /api/v1/protocols/:id       # Update protocol
DELETE /api/v1/protocols/:id       # Delete protocol
```

#### Risk Assessments
```http
GET    /api/v1/assessments         # List assessments
POST   /api/v1/assessments         # Create new assessment
GET    /api/v1/assessments/:id     # Get assessment by ID
DELETE /api/v1/assessments/:id     # Delete assessment
```

### Example Requests

#### Create Protocol Assessment
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

#### Get Assessment Results
```bash
curl http://localhost:3000/api/v1/assessments/assessment-id-here
```

## Testing

### Test Scripts
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run specific test file
npm test -- assessment.service.test.ts
```

### Test Categories

#### Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Fast execution (<100ms per test)

Example unit test:
```typescript
// tests/unit/services/assessment.service.test.ts
import { AssessmentService } from '../../../src/services/assessment.service';

describe('AssessmentService', () => {
  let service: AssessmentService;

  beforeEach(() => {
    service = new AssessmentService();
  });

  it('should create assessment with valid input', async () => {
    const input = {
      protocolId: 'test-protocol',
      contractAddress: '0x123...',
      chainId: 1
    };

    const result = await service.createAssessment(input);
    
    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.status).toBe('pending');
  });
});
```

#### Integration Tests
- Test API endpoints end-to-end
- Use test database/filesystem
- Validate real API responses

Example integration test:
```typescript
// tests/integration/assessments.test.ts
import request from 'supertest';
import { createApp } from '../../src/app';

describe('Assessment API', () => {
  const app = createApp();

  it('should create new assessment', async () => {
    const response = await request(app)
      .post('/api/v1/assessments')
      .send({
        protocolId: 'test-protocol',
        contractAddress: '0x123...',
        chainId: 1
      })
      .expect(201);

    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.status).toBe('pending');
  });
});
```

### Test Data

Use the test data factory for consistent test data:

```typescript
import { MockDataFactory } from '../mock-data.factory';

const mockProtocol = MockDataFactory.createProtocol({
  name: 'Test Protocol',
  contractAddress: '0x123...'
});

const mockAssessment = MockDataFactory.createAssessment({
  protocolId: mockProtocol.id
});
```

## Development Workflow

### Branch Strategy
- **main**: Production-ready code
- **develop**: Development integration branch  
- **feature/**: New features (`feature/add-risk-analyzer`)
- **fix/**: Bug fixes (`fix/calculation-error`)
- **release/**: Release preparation (`release/v1.2.0`)

### Commit Convention
Use conventional commits:
```bash
# Feature
git commit -m "feat(analyzer): add liquidity risk calculation"

# Bug fix  
git commit -m "fix(api): handle invalid contract address"

# Documentation
git commit -m "docs: update API examples"

# Refactor
git commit -m "refactor(service): extract common validation logic"
```

### Development Process

1. **Start Feature**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Development Loop**
   ```bash
   # Make changes
   npm run dev           # Start dev server
   npm test             # Run tests
   npm run lint         # Check code style
   npm run build        # Verify build
   ```

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: implement new feature"
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Target: `develop` branch
   - Include: Description, test results, breaking changes
   - Review: Code review required

### Code Quality

#### ESLint Configuration
```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

#### Type Checking
```bash
# Check TypeScript types
npm run type-check

# Watch mode for development
npm run type-check:watch
```

#### Code Formatting
```bash
# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

## Contributing

### Pull Request Guidelines

1. **Preparation**
   - Ensure all tests pass
   - Update documentation if needed
   - Add tests for new features
   - Follow coding standards

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   ```

3. **Review Process**
   - Automated checks must pass
   - At least one approving review required
   - All conversations resolved

### Coding Standards

#### TypeScript Guidelines
```typescript
// Use explicit types for function parameters and returns
export async function createAssessment(
  data: CreateAssessmentRequest
): Promise<Assessment> {
  // Implementation
}

// Use interfaces for object shapes
interface CreateAssessmentRequest {
  protocolId: string;
  contractAddress: string;
  chainId: number;
  analysisTypes?: AnalysisType[];
}

// Use enums for fixed sets of values
enum AnalysisType {
  CONTRACT = 'contract',
  LIQUIDITY = 'liquidity',
  MARKET = 'market',
  SECURITY = 'security'
}
```

#### Error Handling
```typescript
// Use custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Handle errors consistently
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new ServiceError('Failed to process request');
}
```

## Debugging

### VS Code Debugging

Use the provided launch configurations:

1. **Debug API**: Debug the running application
2. **Debug Tests**: Debug specific test files

### Log-based Debugging

```typescript
import { logger } from '../config/logger';

// Structured logging
logger.info('Processing assessment', {
  assessmentId: assessment.id,
  protocolId: assessment.protocolId,
  step: 'contract-analysis'
});

logger.error('Analysis failed', {
  error: error.message,
  stack: error.stack,
  context: { assessmentId, contractAddress }
});
```

### Common Debug Scenarios

#### 1. API Request Issues
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Test with verbose curl
curl -v -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{"protocolId":"test"}'
```

#### 2. External API Issues
```bash
# Test RPC connectivity
curl -X POST $ETHEREUM_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### 3. Database Issues
```bash
# Check data directory permissions
ls -la data/

# Verify JSON files
cat data/protocols/index.json | jq .

# Clear cache
rm -rf data/cache/*
```

### Performance Debugging

```bash
# Monitor memory usage
node --inspect src/index.ts

# Profile with clinic.js
npm install -g clinic
clinic doctor -- node dist/index.js

# Load testing with autocannon
npm install -g autocannon
autocannon -c 10 -d 30 http://localhost:3000/api/v1/health
```

### Troubleshooting Guide

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Port in use | `EADDRINUSE` error | Change PORT in .env or kill process |
| RPC timeout | `Request timeout` | Check RPC_TIMEOUT_MS and endpoint |
| Memory leak | Increasing memory usage | Profile with heap snapshots |
| Slow tests | Tests take >30s | Use test timeout and mocks |
| Build fails | TypeScript errors | Run `npm run type-check` |

### Getting Help

1. **Check Documentation**: README.md, API docs, this guide
2. **Search Issues**: Look for similar problems in repository
3. **Debug Logs**: Include relevant log output
4. **Minimal Reproduction**: Create simple test case
5. **Environment Details**: Node version, OS, configuration

---

Happy coding! 🚀
