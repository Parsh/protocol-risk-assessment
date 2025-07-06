# DeFi Protocol Risk Assessment - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Internet access for external API calls

### External Dependencies
- **Ethereum RPC Provider** (Infura, Alchemy, or self-hosted)
- **Polygon RPC Provider** (optional, for multi-chain support)
- **BSC RPC Provider** (optional, for multi-chain support)

## Quick Start

### Using Docker (Recommended)

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd protocol-risk-assessment
   cp .env.example .env
   ```

2. **Configure Environment**
   Edit `.env` file with your settings:
   ```bash
   # Required: Add your RPC endpoints
   ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
   
   # Optional: Configure other chains
   POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
   BSC_RPC_URL=https://bsc-dataseed.binance.org/
   ```

3. **Deploy**
   ```bash
   # Make deployment script executable
   chmod +x scripts/deploy.sh
   
   # Deploy with monitoring stack
   ./scripts/deploy.sh
   ```

4. **Verify Deployment**
   ```bash
   # Check service status
   docker-compose ps
   
   # View logs
   docker-compose logs -f api
   
   # Test API
   curl http://localhost:3000/api/v1/health
   ```

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## Production Deployment

### Using Docker Compose (Recommended)

The application includes a complete production stack with monitoring:

```yaml
# docker-compose.yml includes:
# - API service with health checks
# - Nginx reverse proxy with SSL termination
# - Prometheus monitoring
# - Grafana dashboards
# - Log aggregation
```

#### Deploy Production Stack

1. **Prepare Production Environment**
   ```bash
   # Create production directory
   sudo mkdir -p /opt/protocol-risk-assessment
   cd /opt/protocol-risk-assessment
   
   # Clone repository
   git clone <repository-url> .
   
   # Set permissions
   sudo chown -R $USER:$USER .
   ```

2. **Configure Production Settings**
   ```bash
   # Copy and configure environment
   cp .env.example .env
   
   # Edit production configuration
   nano .env
   ```

   **Required Production Settings:**
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Security
   JWT_SECRET=<strong-random-secret-256-bits>
   API_KEY_SECRET=<strong-random-secret>
   
   # Database
   DATA_PATH=/opt/protocol-risk-assessment/data
   
   # RPC Endpoints
   ETHEREUM_RPC_URL=<production-rpc-url>
   POLYGON_RPC_URL=<production-rpc-url>
   BSC_RPC_URL=<production-rpc-url>
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # Caching
   CACHE_TTL_PROTOCOL_DATA=3600
   CACHE_TTL_MARKET_DATA=300
   
   # External APIs
   ETHERSCAN_API_KEY=<your-key>
   POLYGONSCAN_API_KEY=<your-key>
   BSCSCAN_API_KEY=<your-key>
   COINGECKO_API_KEY=<your-key>
   DEFILLAMA_API_KEY=<your-key>
   ```

3. **Deploy Services**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   
   # Deploy full stack
   ./scripts/deploy.sh
   
   # Verify deployment
   docker-compose ps
   docker-compose logs -f
   ```

### Manual Deployment

For environments where Docker is not available:

1. **Build Application**
   ```bash
   npm ci --production
   npm run build
   ```

2. **Setup System Service**
   ```bash
   # Create systemd service
   sudo nano /etc/systemd/system/protocol-risk-assessment.service
   ```

   ```ini
   [Unit]
   Description=DeFi Protocol Risk Assessment API
   After=network.target
   
   [Service]
   Type=simple
   User=node
   WorkingDirectory=/opt/protocol-risk-assessment
   Environment=NODE_ENV=production
   EnvironmentFile=/opt/protocol-risk-assessment/.env
   ExecStart=/usr/bin/node dist/index.js
   Restart=on-failure
   RestartSec=5
   StandardOutput=journal
   StandardError=journal
   
   [Install]
   WantedBy=multi-user.target
   ```

3. **Start Service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable protocol-risk-assessment
   sudo systemctl start protocol-risk-assessment
   sudo systemctl status protocol-risk-assessment
   ```

### Nginx Configuration

For production deployments behind Nginx:

```nginx
# /etc/nginx/sites-available/protocol-risk-assessment
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files (if any)
    location / {
        root /var/www/protocol-risk-assessment;
        try_files $uri $uri/ =404;
    }
}
```

## Environment Variables

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `development` | Yes |
| `PORT` | API server port | `3000` | No |
| `HOST` | API server host | `0.0.0.0` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

### Security

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `API_KEY_SECRET` | API key encryption secret | - | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | `*` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |

### Blockchain RPC

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | - | Yes |
| `POLYGON_RPC_URL` | Polygon RPC endpoint | - | No |
| `BSC_RPC_URL` | BSC RPC endpoint | - | No |
| `RPC_TIMEOUT_MS` | RPC request timeout | `30000` | No |
| `RPC_MAX_RETRIES` | Max RPC retry attempts | `3` | No |

### External APIs

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ETHERSCAN_API_KEY` | Etherscan API key | - | Recommended |
| `POLYGONSCAN_API_KEY` | Polygonscan API key | - | Optional |
| `BSCSCAN_API_KEY` | BSCScan API key | - | Optional |
| `COINGECKO_API_KEY` | CoinGecko API key | - | Optional |
| `DEFILLAMA_API_KEY` | DefiLlama API key | - | Optional |

### Data & Caching

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATA_PATH` | Data storage path | `./data` | No |
| `CACHE_TTL_PROTOCOL_DATA` | Protocol data cache TTL (seconds) | `3600` | No |
| `CACHE_TTL_MARKET_DATA` | Market data cache TTL (seconds) | `300` | No |
| `MAX_CONCURRENT_ASSESSMENTS` | Max concurrent assessments | `5` | No |

## Database Setup

The application uses a file-based storage system with JSON files:

### Directory Structure
```
data/
├── protocols/          # Protocol configurations
├── assessments/        # Risk assessment results
├── cache/             # Cached API responses
│   ├── etherscan/
│   ├── polygonscan/
│   ├── coingecko/
│   ├── defillama/
│   └── slither/
├── logs/              # Application logs
├── backups/           # Data backups
└── temp/              # Temporary files
```

### Data Initialization

The application automatically creates required directories on startup. For production:

```bash
# Create data directory with proper permissions
sudo mkdir -p /opt/protocol-risk-assessment/data
sudo chown -R node:node /opt/protocol-risk-assessment/data
sudo chmod 755 /opt/protocol-risk-assessment/data
```

### Data Migration

When upgrading versions, data migration may be required:

```bash
# Backup current data
./scripts/backup.sh

# Run migration (if available)
npm run migrate

# Verify data integrity
npm run verify-data
```

## Monitoring & Logging

### Application Logs

Logs are written to multiple destinations:

- **Console**: Development and Docker environments
- **Files**: Production environments
  - `data/logs/combined.log`: All log levels
  - `data/logs/error.log`: Error and fatal logs only

### Log Levels

- `error`: Error conditions
- `warn`: Warning conditions  
- `info`: Informational messages
- `debug`: Debug-level messages

### Metrics & Monitoring

The application exposes metrics for monitoring:

- **Health Check**: `GET /api/v1/health`
- **Prometheus Metrics**: Available in Docker stack
- **Request Logging**: All API requests logged
- **Error Tracking**: Detailed error logs with stack traces

### Grafana Dashboards

Pre-configured dashboards available in Docker stack:

- **API Performance**: Request rates, response times, error rates
- **System Health**: CPU, memory, disk usage
- **Business Metrics**: Assessment completion rates, protocol analysis stats

## Backup & Recovery

### Automated Backups

Setup automated backups for production:

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/protocol-risk-assessment/scripts/backup.sh

# Weekly cleanup (keep 4 weeks)
0 3 * * 0 /opt/protocol-risk-assessment/scripts/cleanup-backups.sh
```

### Manual Backup

```bash
# Create backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh /path/to/backup/file
```

### Disaster Recovery

1. **Data Recovery**
   ```bash
   # Stop services
   docker-compose down
   
   # Restore data
   ./scripts/restore.sh /path/to/backup
   
   # Restart services
   docker-compose up -d
   ```

2. **Full System Recovery**
   ```bash
   # On new system
   git clone <repository-url>
   cd protocol-risk-assessment
   
   # Restore configuration
   cp /backup/.env .env
   
   # Restore data
   ./scripts/restore.sh /backup/data-backup.tar.gz
   
   # Deploy
   ./scripts/deploy.sh
   ```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptoms**: Service fails to start or exits immediately

**Diagnosis**:
```bash
# Check logs
docker-compose logs api

# Check environment
docker-compose exec api env | grep NODE_ENV
```

**Solutions**:
- Verify environment variables in `.env`
- Check data directory permissions
- Ensure RPC endpoints are accessible
- Verify port availability

#### 2. API Requests Failing

**Symptoms**: 500 errors, timeouts, or connection refused

**Diagnosis**:
```bash
# Test health endpoint
curl -v http://localhost:3000/api/v1/health

# Check service status
docker-compose ps

# Review error logs
docker-compose logs api | grep ERROR
```

**Solutions**:
- Check RPC endpoint connectivity
- Verify API keys for external services
- Review rate limiting configuration
- Check memory and CPU usage

#### 3. High Memory Usage

**Symptoms**: Service running out of memory or getting killed

**Diagnosis**:
```bash
# Check container memory usage
docker stats

# Review large datasets in logs
docker-compose logs api | grep "large dataset"
```

**Solutions**:
- Increase Docker memory limits
- Reduce concurrent assessment limit
- Clear cache data
- Optimize data retention policies

#### 4. Performance Issues

**Symptoms**: Slow response times, timeouts

**Diagnosis**:
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/health

# Monitor resource usage
docker stats

# Review slow queries in logs
docker-compose logs api | grep "slow"
```

**Solutions**:
- Increase cache TTL values
- Optimize RPC endpoint selection
- Scale horizontally with load balancer
- Use CDN for static responses

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Temporary debug mode
docker-compose exec api npm run debug

# Or set environment variable
LOG_LEVEL=debug docker-compose restart api
```

### Support & Contact

For additional support:

1. **Documentation**: Check this guide and README.md
2. **Logs**: Always include relevant log excerpts
3. **Environment**: Provide system and configuration details
4. **Reproduction**: Include steps to reproduce issues

### Health Checks

Monitor service health:

```bash
# API health
curl http://localhost:3000/api/v1/health

# Container health
docker-compose ps

# System resources
docker stats

# Log health
tail -f data/logs/combined.log
```
