/**
 * DeFi Protocol Risk Assessment Microservice
 * Entry point for the application
 */

import getConfig from './config/environment';

const config = getConfig();

console.log('🚀 DeFi Protocol Risk Assessment Service');
console.log(`📊 Environment: ${config.nodeEnv}`);
console.log(`🔌 Port: ${config.port}`);
console.log(`📁 Data Directory: ${config.dataDir}`);
console.log('📝 Ready for Phase 1.2 implementation...');

// Placeholder for the main application
// This will be replaced with Express server setup in Stage 1.2
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully');
  process.exit(0);
});
