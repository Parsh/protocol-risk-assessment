/**
 * Production Logger configuration using Winston
 * Simplified for production deployment without metrics endpoints
 */

import winston from 'winston';
import path from 'path';
import { config } from './environment';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'data', 'logs');

// Define production log format (JSON for log aggregation)
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

class ProductionLogger {
  private winston: winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: config.nodeEnv === 'development' ? 'debug' : 'info',
      format: productionFormat,
      defaultMeta: { 
        service: 'risk-assessment-api',
        nodeEnv: config.nodeEnv,
        pid: process.pid
      },
      transports: [
        // Error log - only errors
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Combined log - all levels
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Audit log - info and above for security/business events
        new winston.transports.File({
          filename: path.join(logsDir, 'audit.log'),
          level: 'info',
          maxsize: 10485760, // 10MB
          maxFiles: 10,
        }),
      ],
    });

    // Add console transport for development
    if (config.nodeEnv === 'development') {
      this.winston.add(new winston.transports.Console({
        format: developmentFormat,
      }));
    }
  }

  // Standard logging methods
  error(message: string, meta?: any) {
    this.winston.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.winston.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.winston.info(message, meta);
  }

  debug(message: string, meta?: any) {
    this.winston.debug(message, meta);
  }

  // Production-specific structured logging methods
  logRequest(method: string, url: string, statusCode: number, responseTime: number, userAgent?: string) {
    this.winston.info('HTTP Request', {
      method,
      url,
      statusCode,
      responseTime,
      userAgent,
      type: 'request'
    });
  }

  logAssessment(assessmentId: string, protocolName: string, duration: number, status: 'completed' | 'failed') {
    this.winston.info('Assessment Completed', {
      assessmentId,
      protocolName,
      duration,
      status,
      type: 'assessment'
    });
  }

  logSecurityEvent(event: string, details: any) {
    this.winston.warn('Security Event', {
      event,
      details,
      type: 'security',
      timestamp: new Date().toISOString()
    });
  }

  logSystemEvent(event: string, details: any) {
    this.winston.info('System Event', {
      event,
      details,
      type: 'system',
      timestamp: new Date().toISOString()
    });
  }

  // Application lifecycle logging
  logStartup(config: any) {
    this.winston.info('Application Starting', {
      type: 'startup',
      config: {
        nodeEnv: config.nodeEnv,
        port: config.port,
        logLevel: config.logLevel
      }
    });
  }

  logShutdown(reason: string) {
    this.winston.info('Application Shutting Down', {
      type: 'shutdown',
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

// Create and export logger instance
export const logger = new ProductionLogger();

// Export default for convenience
export default logger;
