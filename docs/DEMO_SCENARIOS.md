# Demo Scenarios & Examples

## Table of Contents
- [Quick Demo Setup](#quick-demo-setup)
- [Demo Scenarios](#demo-scenarios)
- [Interactive Examples](#interactive-examples)
- [Use Case Demonstrations](#use-case-demonstrations)
- [Performance Benchmarks](#performance-benchmarks)
- [Integration Examples](#integration-examples)

## Quick Demo Setup

### Prerequisites
- Docker and Docker Compose installed
- Internet connection for external API calls
- 10 minutes for complete setup

### One-Click Demo

```bash
# Clone and start demo environment
git clone <repository-url>
cd protocol-risk-assessment

# Quick demo setup
./scripts/demo-setup.sh

# Access demo interface
open http://localhost:3000/api-docs
```

### Manual Demo Setup

```bash
# 1. Setup environment
cp .env.example .env

# 2. Configure demo settings
cat >> .env << EOF
# Demo configuration
NODE_ENV=development
LOG_LEVEL=info

# Use public RPC endpoints for demo
ETHEREUM_RPC_URL=https://eth.public-rpc.com
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Demo rate limits (more permissive)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
EOF

# 3. Start services
npm install
npm run build
npm start

# 4. Verify setup
curl http://localhost:3000/api/v1/health
```

## Demo Scenarios

### Scenario 1: Basic Protocol Risk Assessment

**Objective**: Assess risk of a well-known DeFi protocol (Uniswap V3)

**Story**: *A DeFi investment fund wants to assess the risk profile of Uniswap V3 before allocating significant capital.*

#### Step 1: Create Protocol Entry
```bash
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "Content-Type: application/json" \
  -d '{
    "id": "uniswap-v3-demo",
    "name": "Uniswap V3 (Demo)",
    "description": "Decentralized exchange with concentrated liquidity",
    "category": "dex",
    "chain": "ethereum",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "website": "https://uniswap.org",
    "github": "https://github.com/Uniswap/v3-core"
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "id": "uniswap-v3-demo",
    "name": "Uniswap V3 (Demo)",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### Step 2: Start Risk Assessment
```bash
curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "uniswap-v3-demo",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "chainId": 1,
    "analysisTypes": ["contract", "liquidity", "market", "security"]
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "id": "assessment-demo-001",
    "status": "pending",
    "estimatedDuration": 1800,
    "analysisTypes": ["contract", "liquidity", "market", "security"]
  }
}
```

#### Step 3: Monitor Progress
```bash
# Check status every 30 seconds
curl http://localhost:3000/api/v1/assessments/assessment-demo-001
```

**Progress Updates:**
```json
// Initial
{"status": "pending", "progress": 0}

// Contract analysis
{"status": "running", "progress": 0.25, "currentPhase": "contract-analysis"}

// Liquidity analysis  
{"status": "running", "progress": 0.50, "currentPhase": "liquidity-analysis"}

// Market analysis
{"status": "running", "progress": 0.75, "currentPhase": "market-analysis"}

// Security analysis
{"status": "running", "progress": 0.90, "currentPhase": "security-analysis"}

// Completed
{"status": "completed", "progress": 1.0, "riskScore": 0.25}
```

#### Step 4: Review Results
```bash
curl http://localhost:3000/api/v1/assessments/assessment-demo-001 | jq '.data.results'
```

**Expected Results:**
```json
{
  "riskScore": 0.25,
  "riskLevel": "low",
  "results": {
    "contract": {
      "score": 0.20,
      "level": "low",
      "findings": [
        {
          "type": "info",
          "title": "Well-audited Contract",
          "description": "Multiple security audits with no critical issues"
        }
      ]
    },
    "liquidity": {
      "score": 0.15,
      "level": "low",
      "metrics": {
        "totalLiquidity": 1500000000,
        "liquidityConcentration": 0.25
      }
    },
    "market": {
      "score": 0.30,
      "level": "medium",
      "metrics": {
        "volatility": 0.45,
        "tradingVolume": 100000000
      }
    },
    "security": {
      "score": 0.35,
      "level": "medium",
      "findings": [
        {
          "type": "warning",
          "title": "Upgrade Proxy Pattern",
          "description": "Contract uses upgradeable proxy pattern"
        }
      ]
    }
  }
}
```

**Key Insights:**
- Overall Risk: **LOW** (0.25/1.0)
- Strengths: Well-audited, high liquidity, established protocol
- Considerations: Upgradeability risk, market volatility

---

### Scenario 2: New Protocol Investigation

**Objective**: Assess a newer, less established DeFi protocol

**Story**: *A researcher wants to evaluate the risk profile of a new lending protocol before publication.*

#### Step 1: Add New Protocol
```bash
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-lending-demo",
    "name": "DemoLend Protocol",
    "description": "New lending protocol with innovative features",
    "category": "lending",
    "chain": "ethereum",
    "contractAddress": "0x742d35Cc6634C0532925a3b8D3Ac754e9fB8B23b"
  }'
```

#### Step 2: Comprehensive Assessment
```bash
curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "new-lending-demo",
    "contractAddress": "0x742d35Cc6634C0532925a3b8D3Ac754e9fB8B23b",
    "chainId": 1,
    "analysisTypes": ["contract", "liquidity", "market", "security"],
    "options": {
      "analysisDepth": "comprehensive",
      "includeHistoricalData": true
    }
  }'
```

**Expected Higher Risk Results:**
```json
{
  "riskScore": 0.75,
  "riskLevel": "high",
  "results": {
    "contract": {
      "score": 0.70,
      "level": "high",
      "findings": [
        {
          "type": "error",
          "title": "No Security Audit",
          "description": "Contract has not undergone professional security audit"
        },
        {
          "type": "warning", 
          "title": "Complex Logic",
          "description": "High complexity score may indicate potential bugs"
        }
      ]
    },
    "liquidity": {
      "score": 0.85,
      "level": "high",
      "metrics": {
        "totalLiquidity": 5000000,
        "liquidityConcentration": 0.90
      }
    }
  }
}
```

---

### Scenario 3: Multi-Chain Protocol Comparison

**Objective**: Compare the same protocol deployed on different chains

**Story**: *A DAO treasury manager wants to compare Uniswap deployments across Ethereum and Polygon for optimal deployment strategy.*

#### Compare Ethereum vs Polygon Deployment

```bash
# Ethereum Uniswap V3
curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "uniswap-v3-eth",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "chainId": 1,
    "analysisTypes": ["liquidity", "market"]
  }'

# Polygon Uniswap V3  
curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "uniswap-v3-polygon", 
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "chainId": 137,
    "analysisTypes": ["liquidity", "market"]
  }'
```

**Comparison Results:**
```bash
# Generate comparison report
curl http://localhost:3000/api/v1/assessments/compare?ids=assessment-eth,assessment-polygon
```

---

## Interactive Examples

### Web Dashboard Demo

Access the interactive demo dashboard:

```bash
# Start with demo UI
npm run demo

# Access dashboard
open http://localhost:3001/dashboard
```

**Dashboard Features:**
- Real-time assessment monitoring
- Risk score visualization
- Protocol comparison charts
- Historical trend analysis

### Postman Collection

Import the provided Postman collection for interactive testing:

```bash
# Download collection
curl -o RiskAssessment.postman_collection.json \
  https://raw.githubusercontent.com/example/protocol-risk-assessment/main/demo/RiskAssessment.postman_collection.json

# Import into Postman and set environment variables:
# - base_url: http://localhost:3000
# - api_key: your-demo-key
```

### Jupyter Notebook Demo

Interactive Python notebook for data scientists:

```python
# demo/risk_analysis_demo.ipynb

import requests
import pandas as pd
import matplotlib.pyplot as plt

# Setup API client
base_url = "http://localhost:3000"
headers = {"Content-Type": "application/json"}

# Create assessment
def create_assessment(protocol_id, contract_address):
    response = requests.post(f"{base_url}/api/v1/assessments", 
                           headers=headers,
                           json={
                               "protocolId": protocol_id,
                               "contractAddress": contract_address,
                               "chainId": 1,
                               "analysisTypes": ["contract", "liquidity", "market", "security"]
                           })
    return response.json()["data"]["id"]

# Analyze multiple protocols
protocols = [
    ("uniswap-v3", "0x1F98431c8aD98523631AE4a59f267346ea31F984"),
    ("compound-v3", "0xc3d688B66703497DAA19211EEdff47f25384cdc3"),
    ("aave-v3", "0x87870Bace3f8a42a7c2fc5aEa51c41d8Db0D8799")
]

# Create assessments and collect results
results = []
for name, address in protocols:
    assessment_id = create_assessment(name, address)
    # Wait for completion and collect results
    # ... (polling logic)
    results.append(result)

# Visualize risk comparison
df = pd.DataFrame(results)
df.plot(x='protocol', y='riskScore', kind='bar', title='Protocol Risk Comparison')
plt.show()
```

## Use Case Demonstrations

### Use Case 1: Investment Due Diligence

**Scenario**: Venture capital firm evaluating DeFi protocols for investment

**Demo Script:**
```bash
#!/bin/bash
# investment_due_diligence.sh

echo "=== Investment Due Diligence Demo ==="
echo "Evaluating multiple protocols for investment..."

# Portfolio of protocols to evaluate
PROTOCOLS=(
  "uniswap-v3:0x1F98431c8aD98523631AE4a59f267346ea31F984"
  "compound-v3:0xc3d688B66703497DAA19211EEdff47f25384cdc3"  
  "aave-v3:0x87870Bace3f8a42a7c2fc5aEa51c41d8Db0D8799"
  "curve-fi:0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7"
)

ASSESSMENT_IDS=()

# Start assessments for all protocols
for PROTOCOL in "${PROTOCOLS[@]}"; do
  IFS=':' read -r PROTOCOL_ID CONTRACT_ADDRESS <<< "$PROTOCOL"
  
  echo "Starting assessment for $PROTOCOL_ID..."
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/assessments \
    -H "Content-Type: application/json" \
    -d "{
      \"protocolId\": \"$PROTOCOL_ID\",
      \"contractAddress\": \"$CONTRACT_ADDRESS\",
      \"chainId\": 1,
      \"analysisTypes\": [\"contract\", \"liquidity\", \"market\", \"security\"]
    }")
  
  ASSESSMENT_ID=$(echo $RESPONSE | jq -r '.data.id')
  ASSESSMENT_IDS+=($ASSESSMENT_ID)
  echo "Assessment ID: $ASSESSMENT_ID"
done

# Wait for all assessments to complete
echo "Waiting for assessments to complete..."
sleep 30

# Generate investment report
echo "=== INVESTMENT RISK REPORT ==="
for i in "${!ASSESSMENT_IDS[@]}"; do
  ASSESSMENT_ID="${ASSESSMENT_IDS[$i]}"
  PROTOCOL="${PROTOCOLS[$i]}"
  
  RESULT=$(curl -s http://localhost:3000/api/v1/assessments/$ASSESSMENT_ID)
  RISK_SCORE=$(echo $RESULT | jq -r '.data.riskScore')
  RISK_LEVEL=$(echo $RESULT | jq -r '.data.riskLevel')
  
  echo "Protocol: $(echo $PROTOCOL | cut -d: -f1)"
  echo "Risk Score: $RISK_SCORE"
  echo "Risk Level: $RISK_LEVEL"
  echo "---"
done
```

### Use Case 2: Continuous Monitoring

**Scenario**: DeFi treasury continuously monitoring protocol health

**Demo Script:**
```bash
#!/bin/bash
# continuous_monitoring.sh

echo "=== Continuous Protocol Monitoring Demo ==="

# Treasury portfolio
PORTFOLIO=(
  "treasury-uniswap:0x1F98431c8aD98523631AE4a59f267346ea31F984"
  "treasury-compound:0xc3d688B66703497DAA19211EEdff47f25384cdc3"
)

while true; do
  echo "$(date): Running periodic risk assessment..."
  
  for PROTOCOL in "${PORTFOLIO[@]}"; do
    IFS=':' read -r PROTOCOL_ID CONTRACT_ADDRESS <<< "$PROTOCOL"
    
    # Quick assessment
    curl -s -X POST http://localhost:3000/api/v1/assessments \
      -H "Content-Type: application/json" \
      -d "{
        \"protocolId\": \"$PROTOCOL_ID\",
        \"contractAddress\": \"$CONTRACT_ADDRESS\",
        \"chainId\": 1,
        \"analysisTypes\": [\"liquidity\", \"market\"],
        \"options\": {\"analysisDepth\": \"quick\"}
      }" > /dev/null
  done
  
  # Wait 1 hour before next check
  sleep 3600
done
```

### Use Case 3: Regulatory Compliance

**Scenario**: Financial institution ensuring DeFi protocols meet compliance requirements

**Demo Features:**
- Automated compliance scoring
- Regulatory risk assessment
- Audit trail generation
- Report generation for regulators

```bash
# compliance_check.sh
echo "=== Regulatory Compliance Assessment ==="

curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "compliance-protocol",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "chainId": 1,
    "analysisTypes": ["security", "contract"],
    "options": {
      "complianceMode": true,
      "regulatoryFramework": "EU-MiCA",
      "auditTrail": true
    }
  }'
```

## Performance Benchmarks

### Benchmark Suite

```bash
# Run performance benchmarks
npm run benchmark

# Results:
# ✓ Health check: 5ms avg response
# ✓ Protocol creation: 25ms avg response  
# ✓ Assessment creation: 15ms avg response
# ✓ Assessment completion: 30s avg (simple), 180s (comprehensive)
# ✓ Concurrent assessments: 5 parallel, 60s total
```

### Load Testing

```bash
# Install autocannon for load testing
npm install -g autocannon

# Test API endpoints
autocannon -c 10 -d 30 http://localhost:3000/api/v1/health
autocannon -c 5 -d 60 -m POST -H "Content-Type: application/json" \
  -b '{"protocolId":"test","contractAddress":"0x123","chainId":1}' \
  http://localhost:3000/api/v1/assessments
```

**Expected Performance:**
- Health endpoint: 1000+ req/sec
- Assessment creation: 50+ req/sec
- Assessment retrieval: 500+ req/sec
- Memory usage: <512MB under normal load
- CPU usage: <50% under normal load

### Stress Testing

```bash
# Stress test with multiple concurrent assessments
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/assessments \
    -H "Content-Type: application/json" \
    -d "{
      \"protocolId\": \"stress-test-$i\",
      \"contractAddress\": \"0x$(printf %040d $i)\",
      \"chainId\": 1,
      \"analysisTypes\": [\"contract\", \"liquidity\"]
    }" &
done
wait
```

## Integration Examples

### Node.js Application Integration

```javascript
// example-app.js
const express = require('express');
const axios = require('axios');

const app = express();
const riskAPI = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {'X-API-Key': 'your-api-key'}
});

// Endpoint to assess protocol and return simplified risk level
app.get('/risk/:protocolId', async (req, res) => {
  try {
    // Start assessment
    const assessment = await riskAPI.post('/assessments', {
      protocolId: req.params.protocolId,
      contractAddress: req.query.address,
      chainId: parseInt(req.query.chain || '1'),
      analysisTypes: ['contract', 'security']
    });
    
    // Poll for completion (simplified)
    const assessmentId = assessment.data.data.id;
    let result;
    
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      result = await riskAPI.get(`/assessments/${assessmentId}`);
    } while (result.data.data.status !== 'completed');
    
    // Return risk level
    res.json({
      protocolId: req.params.protocolId,
      riskLevel: result.data.data.riskLevel,
      riskScore: result.data.data.riskScore,
      recommendations: result.data.data.recommendations
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

app.listen(3001, () => {
  console.log('Example app running on port 3001');
});
```

### Python Data Analysis Integration

```python
# risk_analyzer.py
import requests
import pandas as pd
import time
from datetime import datetime

class DeFiRiskAnalyzer:
    def __init__(self, api_base="http://localhost:3000", api_key=None):
        self.base_url = f"{api_base}/api/v1"
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["X-API-Key"] = api_key
    
    def assess_protocol(self, protocol_id, contract_address, chain_id=1):
        """Create and wait for protocol assessment"""
        
        # Start assessment
        response = requests.post(f"{self.base_url}/assessments",
                               headers=self.headers,
                               json={
                                   "protocolId": protocol_id,
                                   "contractAddress": contract_address,
                                   "chainId": chain_id,
                                   "analysisTypes": ["contract", "liquidity", "market", "security"]
                               })
        
        assessment_id = response.json()["data"]["id"]
        
        # Poll for completion
        while True:
            result = requests.get(f"{self.base_url}/assessments/{assessment_id}",
                                headers=self.headers)
            data = result.json()["data"]
            
            if data["status"] == "completed":
                return data
            elif data["status"] == "failed":
                raise Exception(f"Assessment failed: {data.get('error', 'Unknown error')}")
            
            time.sleep(10)
    
    def batch_assess(self, protocols):
        """Assess multiple protocols and return DataFrame"""
        results = []
        
        for protocol in protocols:
            print(f"Assessing {protocol['id']}...")
            try:
                result = self.assess_protocol(
                    protocol['id'],
                    protocol['address'],
                    protocol.get('chain', 1)
                )
                
                results.append({
                    'protocol_id': protocol['id'],
                    'risk_score': result['riskScore'],
                    'risk_level': result['riskLevel'],
                    'contract_score': result['results']['contract']['score'],
                    'liquidity_score': result['results']['liquidity']['score'],
                    'market_score': result['results']['market']['score'],
                    'security_score': result['results']['security']['score'],
                    'timestamp': datetime.now()
                })
            except Exception as e:
                print(f"Failed to assess {protocol['id']}: {e}")
        
        return pd.DataFrame(results)

# Usage example
if __name__ == "__main__":
    analyzer = DeFiRiskAnalyzer()
    
    protocols = [
        {"id": "uniswap-v3", "address": "0x1F98431c8aD98523631AE4a59f267346ea31F984"},
        {"id": "compound-v3", "address": "0xc3d688B66703497DAA19211EEdff47f25384cdc3"},
    ]
    
    df = analyzer.batch_assess(protocols)
    print(df)
    
    # Save results
    df.to_csv(f"risk_assessment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
```

### React Frontend Integration

```jsx
// RiskDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RiskDashboard = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const api = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: {'X-API-Key': process.env.REACT_APP_API_KEY}
  });
  
  const createAssessment = async (protocolData) => {
    setLoading(true);
    try {
      const response = await api.post('/assessments', protocolData);
      const assessmentId = response.data.data.id;
      
      // Poll for completion
      const result = await pollAssessment(assessmentId);
      setAssessments(prev => [...prev, result]);
    } catch (error) {
      console.error('Assessment failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const pollAssessment = async (assessmentId) => {
    while (true) {
      const response = await api.get(`/assessments/${assessmentId}`);
      const data = response.data.data;
      
      if (data.status === 'completed') {
        return data;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  };
  
  const getRiskColor = (riskLevel) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      critical: 'darkred'
    };
    return colors[riskLevel] || 'gray';
  };
  
  return (
    <div className="risk-dashboard">
      <h1>DeFi Risk Assessment Dashboard</h1>
      
      <div className="assessment-form">
        <button 
          onClick={() => createAssessment({
            protocolId: 'demo-protocol',
            contractAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            chainId: 1,
            analysisTypes: ['contract', 'liquidity', 'market', 'security']
          })}
          disabled={loading}
        >
          {loading ? 'Assessing...' : 'Start Demo Assessment'}
        </button>
      </div>
      
      <div className="assessments-list">
        {assessments.map(assessment => (
          <div key={assessment.id} className="assessment-card">
            <h3>{assessment.protocolId}</h3>
            <div 
              className="risk-score"
              style={{color: getRiskColor(assessment.riskLevel)}}
            >
              Risk Level: {assessment.riskLevel} ({assessment.riskScore.toFixed(2)})
            </div>
            <div className="risk-breakdown">
              <div>Contract: {assessment.results.contract.score.toFixed(2)}</div>
              <div>Liquidity: {assessment.results.liquidity.score.toFixed(2)}</div>
              <div>Market: {assessment.results.market.score.toFixed(2)}</div>
              <div>Security: {assessment.results.security.score.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskDashboard;
```

---

## Demo Environment Cleanup

After running demos, clean up the environment:

```bash
# Stop services
docker-compose down

# Clean demo data
rm -rf data/protocols/*demo*
rm -rf data/assessments/*demo*

# Reset to clean state
./scripts/reset-demo.sh
```

---

## Additional Resources

- **Video Demos**: [Link to video demonstrations]
- **Live Demo Environment**: [https://demo.risk-assessment.example.com]
- **Postman Collection**: [Download link]
- **Jupyter Notebooks**: [GitHub link to interactive notebooks]
- **Integration Examples**: [GitHub repository with more examples]

---

*For questions about demos or to request custom demonstration scenarios, please contact the development team.*
