# DeFi Risk Assessment Data Directory

This directory contains all persistent data for the DeFi Risk Assessment service.

## Directory Structure

```
data/
├── protocols/              # Protocol registry and data
│   ├── index.json         # Protocol metadata index
│   └── {protocolId}.json  # Individual protocol files
├── assessments/           # Risk assessment results
│   ├── index.json         # Assessment metadata index
│   └── {assessmentId}.json # Individual assessment files
├── cache/                 # External API response cache
│   ├── etherscan/         # Etherscan API responses
│   ├── defillama/         # DeFiLlama API responses
│   ├── coingecko/         # CoinGecko API responses
│   └── slither/           # Slither analysis cache
├── logs/                  # Application logs
│   ├── combined.log       # All application logs
│   └── error.log          # Error logs only
├── backups/               # Automatic backups
└── temp/                  # Temporary files
```

## Data Format

All data files are stored as JSON with the following characteristics:
- Atomic file operations ensure data integrity
- Automatic backups are created before modifications
- File locking prevents concurrent write conflicts
- Indexing provides fast metadata lookups

## Maintenance

- Log files are automatically rotated (5MB max, 5 files kept)
- Backup files are created with timestamps
- Temporary files are automatically cleaned up
- Cache files have configurable TTL

Generated: 2025-07-06T08:01:02.913Z
