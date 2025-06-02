const winston = require('winston');
// Winston is a versatile logging library for Node.js
// It provides multiple transport options (console, files, etc),
// log levels, and formatting capabilities
// We use it here to implement robust logging across all workflow processors

/**
 * Base class for all processors in the workflow
 * Provides common functionality like logging and error handling
 */
class BaseProcessor {
  /**
   * Create a new BaseProcessor
   * @throws {Error} If logger initialization fails
   */
  constructor() {
    try {
      this.logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        defaultMeta: { service: 'workflow-processor' },
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
          }),
          new winston.transports.File({
            filename: 'error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ],
      });

      // Handle uncaught exceptions and rejections
      this.logger.exceptions.handle(new winston.transports.File({ filename: 'exceptions.log' }));
      this.logger.rejections.handle(new winston.transports.File({ filename: 'rejections.log' }));

      this.logInfo('Base processor initialized');
    } catch (error) {
      console.error('Failed to initialize logger:', error);
      throw error;
    }
  }

  /**
   * Process a message - must be implemented by child classes
   * @param {Object} message - The message to process
   * @returns {Promise<Object>} The processed message
   * @throws {Error} If not implemented by child class
   */
  async processMessage(message) {
    throw new Error('Method processMessage() must be implemented by child class');
  }

  /**
   * Handle errors in a consistent way across all processors
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context about the error
   * @throws {Error} The original error after logging
   */
  async handleError(error, context = {}) {
    const errorContext = {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
    };

    this.logger.error({
      message: error.message,
      ...errorContext,
    });

    // If the error is not already an instance of Error, wrap it
    if (!(error instanceof Error)) {
      error = new Error(error);
    }

    throw error;
  }

  /**
   * Log informational messages
   * @param {string} message - The message to log
   * @param {Object} [data={}] - Additional data to include in the log
   */
  logInfo(message, data = {}) {
    this.logger.info(message, data);
  }

  /**
   * Log warning messages
   * @param {string} message - The message to log
   * @param {Object} [data={}] - Additional data to include in the log
   */
  logWarning(message, data = {}) {
    this.logger.warn(message, data);
  }

  /**
   * Log debug messages
   * @param {string} message - The message to log
   * @param {Object} [data={}] - Additional data to include in the log
   */
  logDebug(message, data = {}) {
    this.logger.debug(message, data);
  }

  /**
   * Log error messages
   * @param {string} message - The message to log
   * @param {Object} [data={}] - Additional data to include in the log
   */
  logError(message, data = {}) {
    this.logger.error(message, data);
  }
}

module.exports = BaseProcessor;
