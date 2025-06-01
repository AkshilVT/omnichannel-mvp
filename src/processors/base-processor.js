const winston = require('winston');
// Winston is a versatile logging library for Node.js
// It provides multiple transport options (console, files, etc),
// log levels, and formatting capabilities
// We use it here to implement robust logging across all workflow processors

class BaseProcessor {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });
  }

  async processMessage(message) {
    throw new Error('Method processMessage() must be implemented by child class');
  }

  async handleError(error, context) {
    this.logger.error({
      message: error.message,
      stack: error.stack,
      context,
    });
    throw error;
  }

  logInfo(message, data = {}) {
    this.logger.info(message, data);
  }
}

module.exports = BaseProcessor;
