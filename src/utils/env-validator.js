/**
 * Environment variable validation utility
 * Provides functions to validate and check environment variables
 */
const { REQUIRED_ENV_VARS } = require('../config/constants');

/**
 * Custom error class for environment validation errors
 */
class EnvValidationError extends Error {
  /**
   * Create a new EnvValidationError
   * @param {string} message - Error message
   * @param {string[]} missingVars - Array of missing environment variables
   */
  constructor(message, missingVars) {
    super(message);
    this.name = 'EnvValidationError';
    this.missingVars = missingVars;
  }
}

/**
 * Validates that all required environment variables are present
 * @throws {EnvValidationError} If any required environment variable is missing
 */
function validateEnv() {
  const missingVars = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new EnvValidationError(
      `Missing required environment variables: ${missingVars.join(', ')}`,
      missingVars,
    );
  }
}

/**
 * Checks if a specific environment variable is set
 * @param {string} varName - Name of the environment variable to check
 * @returns {boolean} True if the variable is set, false otherwise
 */
function isEnvVarSet(varName) {
  return !!process.env[varName];
}

/**
 * Gets the value of an environment variable with a default fallback
 * @param {string} varName - Name of the environment variable
 * @param {*} defaultValue - Default value to return if variable is not set
 * @returns {*} The environment variable value or default value
 */
function getEnvVar(varName, defaultValue) {
  return process.env[varName] || defaultValue;
}

/**
 * Gets all environment variables that match a prefix
 * @param {string} prefix - Prefix to filter environment variables
 * @returns {Object.<string, string>} Object containing matching environment variables
 */
function getEnvVarsByPrefix(prefix) {
  return Object.entries(process.env)
    .filter(([key]) => key.startsWith(prefix))
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

module.exports = {
  validateEnv,
  isEnvVarSet,
  getEnvVar,
  getEnvVarsByPrefix,
  EnvValidationError,
};
