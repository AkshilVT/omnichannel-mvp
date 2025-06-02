/**
 * Custom error class for application-specific errors
 * Provides structured error handling with error codes and context
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - The error message
   * @param {string} code - The error code
   * @param {Object} [context={}] - Additional context about the error
   * @param {Error} [originalError] - The original error that caused this error
   */
  constructor(message, code, context = {}, originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.originalError = originalError;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to a plain object for serialization
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : null,
    };
  }

  /**
   * Create an AppError from another error
   * @param {Error} error - The original error
   * @param {string} code - The error code
   * @param {Object} [context={}] - Additional context
   * @returns {AppError} A new AppError instance
   */
  static fromError(error, code, context = {}) {
    return new AppError(
      error.message,
      code,
      {
        ...context,
        originalError: error,
      },
      error,
    );
  }

  /**
   * Check if an error is an instance of AppError
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error is an AppError
   */
  static isAppError(error) {
    return error instanceof AppError;
  }
}

module.exports = AppError;
