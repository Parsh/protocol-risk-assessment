#!/bin/bash

# Demo Setup Script for DeFi Protocol Risk Assessment
# This script sets up a complete demo environment with sample data

set -e

echo "🚀 Setting up DeFi Protocol Risk Assessment Demo Environment"
echo "============================================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ and try again."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed. Please install npm and try again."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Some demo features will be limited."
    DOCKER_AVAILABLE=false
else
    DOCKER_AVAILABLE=true
fi

echo "✅ Prerequisites check complete"

# Setup environment
echo "🔧 Setting up environment..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file from template"
    
    # Configure demo-friendly settings
    cat >> .env << EOF

# Demo Configuration
NODE_ENV=development
LOG_LEVEL=info

# Public RPC endpoints for demo (no API key required)
ETHEREUM_RPC_URL=https://eth.public-rpc.com
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Demo rate limits (more permissive)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Demo security (not for production)
JWT_SECRET=demo-jwt-secret-key-not-for-production
API_KEY_SECRET=demo-api-key-secret-not-for-production
EOF
    
    echo "⚙️  Configured demo environment variables"
else
    echo "📄 Using existing .env file"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Create demo data structure
echo "📂 Setting up demo data..."

mkdir -p data/protocols
mkdir -p data/assessments
mkdir -p data/cache
mkdir -p data/logs
mkdir -p data/backups

# Create demo protocols
cat > data/protocols/index.json << 'EOF'
{
  "protocols": [
    {
      "id": "uniswap-v3-demo",
      "name": "Uniswap V3 (Demo)",
      "description": "Decentralized exchange with concentrated liquidity",
      "category": "dex",
      "chain": "ethereum",
      "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      "website": "https://uniswap.org",
      "documentation": "https://docs.uniswap.org",
      "github": "https://github.com/Uniswap/v3-core",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "compound-v3-demo",
      "name": "Compound V3 (Demo)",
      "description": "Algorithmic money market protocol",
      "category": "lending",
      "chain": "ethereum",
      "contractAddress": "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
      "website": "https://compound.finance",
      "documentation": "https://docs.compound.finance",
      "github": "https://github.com/compound-finance/compound-protocol",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "aave-v3-demo",
      "name": "Aave V3 (Demo)",
      "description": "Decentralized lending and borrowing protocol",
      "category": "lending",
      "chain": "ethereum",
      "contractAddress": "0x87870Bace3f8a42a7c2fc5aEa51c41d8Db0D8799",
      "website": "https://aave.com",
      "documentation": "https://docs.aave.com",
      "github": "https://github.com/aave/protocol-v2",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
EOF

echo "✅ Created demo protocol data"

# Create demo assessment data
ASSESSMENT_ID="demo-assessment-$(date +%s)"
cat > "data/assessments/${ASSESSMENT_ID}.json" << EOF
{
  "id": "${ASSESSMENT_ID}",
  "protocolId": "uniswap-v3-demo",
  "protocolName": "Uniswap V3 (Demo)",
  "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  "chainId": 1,
  "status": "completed",
  "analysisTypes": ["contract", "liquidity", "market", "security"],
  "riskScore": 0.25,
  "riskLevel": "low",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "completedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "duration": 1800,
  "results": {
    "contract": {
      "score": 0.20,
      "level": "low",
      "findings": [
        {
          "type": "info",
          "title": "Well-audited Contract",
          "description": "Multiple security audits with no critical issues",
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
    "externalSources": ["etherscan", "coingecko", "defillama"]
  }
}
EOF

# Update assessments index
cat > data/assessments/index.json << EOF
{
  "assessments": [
    {
      "id": "${ASSESSMENT_ID}",
      "protocolId": "uniswap-v3-demo",
      "status": "completed",
      "riskScore": 0.25,
      "riskLevel": "low",
      "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
    }
  ]
}
EOF

echo "✅ Created demo assessment data"

# Start the application
echo "🚀 Starting demo application..."

# Start in background
npm start &
APP_PID=$!

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Test if application is running
if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "✅ Application started successfully!"
else
    echo "❌ Application failed to start. Checking logs..."
    kill $APP_PID 2>/dev/null || true
    exit 1
fi

# Docker demo setup (if available)
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Setting up Docker demo (optional)..."
    
    if [ -f docker-compose.yml ]; then
        echo "📝 Docker Compose configuration found"
        echo "💡 You can run the full stack with: docker-compose up -d"
    fi
fi

# Display demo information
echo ""
echo "🎉 Demo Environment Setup Complete!"
echo "=================================="
echo ""
echo "🌐 API Endpoints:"
echo "   Health Check:     http://localhost:3000/api/v1/health"
echo "   API Documentation: http://localhost:3000/api-docs"
echo "   Protocols:        http://localhost:3000/api/v1/protocols"
echo "   Assessments:      http://localhost:3000/api/v1/assessments"
echo ""
echo "📊 Demo Data:"
echo "   Protocols: 3 sample DeFi protocols"
echo "   Assessments: 1 completed assessment"
echo ""
echo "🔧 Demo Commands:"
echo "   Test API:         curl http://localhost:3000/api/v1/health"
echo "   List Protocols:   curl http://localhost:3000/api/v1/protocols"
echo "   View Assessment:  curl http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID}"
echo ""
echo "📚 Documentation:"
echo "   Deployment Guide: ./docs/DEPLOYMENT_GUIDE.md"
echo "   Developer Guide:  ./docs/DEVELOPER_GUIDE.md"
echo "   API Reference:    ./docs/API_REFERENCE.md"
echo "   Demo Scenarios:   ./docs/DEMO_SCENARIOS.md"
echo ""

# Create demo script
cat > demo-commands.sh << 'EOF'
#!/bin/bash

echo "🎮 DeFi Risk Assessment Demo Commands"
echo "===================================="
echo ""

echo "1. 🏥 Health Check"
echo "curl http://localhost:3000/api/v1/health"
curl -s http://localhost:3000/api/v1/health | jq '.'
echo ""

echo "2. 📋 List Protocols"
echo "curl http://localhost:3000/api/v1/protocols"
curl -s http://localhost:3000/api/v1/protocols | jq '.data[] | {id, name, category, chain}'
echo ""

echo "3. 📊 List Assessments"  
echo "curl http://localhost:3000/api/v1/assessments"
curl -s http://localhost:3000/api/v1/assessments | jq '.data[] | {id, protocolId, riskLevel, riskScore}'
echo ""

echo "4. 🔍 Get Specific Assessment"
ASSESSMENT_ID=$(curl -s http://localhost:3000/api/v1/assessments | jq -r '.data[0].id')
echo "curl http://localhost:3000/api/v1/assessments/$ASSESSMENT_ID"
curl -s "http://localhost:3000/api/v1/assessments/$ASSESSMENT_ID" | jq '.data | {id, protocolId, riskLevel, riskScore, results: (.results | keys)}'
echo ""

echo "5. 🆕 Create New Assessment"
echo "curl -X POST http://localhost:3000/api/v1/assessments -H 'Content-Type: application/json' -d '{...}'"
echo "(This will take 30-60 seconds to complete)"
echo ""

echo "💡 For more examples, see ./docs/DEMO_SCENARIOS.md"
EOF

chmod +x demo-commands.sh

echo "📜 Created demo-commands.sh for quick testing"
echo ""
echo "🚀 Run './demo-commands.sh' to test the demo environment"
echo ""

# Create cleanup script
cat > demo-cleanup.sh << 'EOF'
#!/bin/bash

echo "🧹 Cleaning up demo environment..."

# Stop application
pkill -f "node.*index.js" || true

# Clean demo data (keep structure)
rm -f data/protocols/index.json
rm -f data/assessments/*.json
rm -f data/assessments/index.json
rm -rf data/cache/*
rm -rf data/logs/*

# Remove demo scripts
rm -f demo-commands.sh

echo "✅ Demo cleanup complete"
EOF

chmod +x demo-cleanup.sh

echo "🗑️  Created demo-cleanup.sh for cleanup"
echo ""
echo "⚠️  Remember to stop the demo with: pkill -f 'node.*index.js'"
echo "   Or use: ./demo-cleanup.sh"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 For production-like demo with monitoring:"
    echo "   docker-compose up -d"
    echo ""
fi

echo "🎯 Next Steps:"
echo "1. Test the API with: ./demo-commands.sh"
echo "2. Visit API docs: http://localhost:3000/api-docs"
echo "3. Try the demo scenarios in: ./docs/DEMO_SCENARIOS.md"
echo "4. When done, cleanup with: ./demo-cleanup.sh"
echo ""
echo "✨ Happy testing!"
