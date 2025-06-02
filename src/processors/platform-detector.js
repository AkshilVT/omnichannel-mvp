const BaseProcessor = require('./base-processor');
const { PLATFORM_PATTERNS } = require('../config/constants');

/**
 * Detects the platform type from a URL
 * Uses predefined patterns to identify various social media and content platforms
 */
class PlatformDetector extends BaseProcessor {
  /**
   * Create a new PlatformDetector
   */
  constructor() {
    super();
    this.platformPatterns = PLATFORM_PATTERNS;
    this.logInfo('Platform detector initialized', {
      supportedPlatforms: Object.keys(this.platformPatterns),
    });
  }

  /**
   * Process a message to detect the platform from its URL
   * @param {Object} message - The message containing a URL
   * @param {string} message.url - The URL to detect platform from
   * @returns {Promise<Object>} The message with platform information added
   * @throws {Error} If URL is missing or invalid
   */
  async processMessage(message) {
    try {
      if (!message.url) {
        throw new Error('URL is required for platform detection');
      }

      const platform = this.detectPlatform(message.url);
      this.logInfo('Platform detected', {
        url: message.url,
        platform,
        timestamp: new Date().toISOString(),
      });

      return {
        ...message,
        platform,
        detectedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.handleError(error, { url: message.url });
      throw error;
    }
  }

  /**
   * Detect the platform type from a URL
   * @param {string} url - The URL to detect platform from
   * @returns {string} The detected platform type
   * @throws {Error} If URL is invalid
   */
  detectPlatform(url) {
    if (typeof url !== 'string' || !url.trim()) {
      throw new Error('Invalid URL provided for platform detection');
    }

    try {
      // Validate URL format
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${error.message}`);
    }

    for (const [platform, pattern] of Object.entries(this.platformPatterns)) {
      if (pattern.test(url)) {
        this.logDebug('Platform pattern matched', {
          url,
          platform,
          pattern: pattern.toString(),
        });
        return platform.toLowerCase();
      }
    }

    this.logWarning('No platform pattern matched', { url });
    return 'unknown';
  }

  /**
   * Get list of supported platforms
   * @returns {string[]} Array of supported platform names
   */
  getSupportedPlatforms() {
    return Object.keys(this.platformPatterns);
  }
}

module.exports = PlatformDetector;
