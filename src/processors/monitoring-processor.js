const BaseProcessor = require('./base-processor');

/**
 * Handles API quota and rate limiting for external services
 */
class MonitoringProcessor extends BaseProcessor {
  /**
   * Create a new MonitoringProcessor
   * @param {Object} options - Configuration options
   * @param {number} [options.quotaLimit=10000] - Daily quota limit
   * @param {number} [options.rateLimit=100] - Maximum requests per rate window
   * @param {number} [options.rateWindowMs=60000] - Rate limit window in milliseconds
   */
  constructor({ quotaLimit = 10000, rateLimit = 100, rateWindowMs = 60000 } = {}) {
    super();
    this.quotaLimit = quotaLimit;
    this.quotaUsed = 0;
    this.quotaResetTime = this._nextMidnight();
    this.rateLimit = rateLimit;
    this.rateWindowMs = rateWindowMs;
    this.requests = [];

    this.logInfo('Initialized monitoring processor', {
      quotaLimit,
      rateLimit,
      rateWindowMs,
    });
  }

  /**
   * Calculate the next midnight timestamp
   * @private
   * @returns {Date} Next midnight timestamp
   */
  _nextMidnight() {
    const now = new Date();
    const reset = new Date(now);
    reset.setHours(24, 0, 0, 0);
    return reset;
  }

  /**
   * Check if the request would exceed the daily quota
   * @param {number} [cost=1] - Cost of the request in quota units
   * @throws {Error} If quota would be exceeded
   */
  checkQuota(cost = 1) {
    const now = new Date();
    if (now > this.quotaResetTime) {
      this.logInfo('Resetting daily quota', {
        previousQuotaUsed: this.quotaUsed,
        quotaLimit: this.quotaLimit,
      });
      this.quotaUsed = 0;
      this.quotaResetTime = this._nextMidnight();
    }

    if (this.quotaUsed + cost > this.quotaLimit) {
      const error = new Error(
        `Daily quota limit exceeded. Used: ${this.quotaUsed}/${this.quotaLimit}`,
      );
      this.logError('Quota limit exceeded', {
        quotaUsed: this.quotaUsed,
        quotaLimit: this.quotaLimit,
        cost,
      });
      throw error;
    }

    this.quotaUsed += cost;
    this.logInfo('Updated quota usage', {
      quotaUsed: this.quotaUsed,
      quotaLimit: this.quotaLimit,
      cost,
    });
  }

  /**
   * Check if the request would exceed the rate limit
   * @throws {Error} If rate limit would be exceeded
   */
  checkRateLimit() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.rateWindowMs);

    if (this.requests.length >= this.rateLimit) {
      const error = new Error('Rate limit exceeded. Please try again later.');
      this.logError('Rate limit exceeded', {
        requestsInWindow: this.requests.length,
        rateLimit: this.rateLimit,
        rateWindowMs: this.rateWindowMs,
      });
      throw error;
    }

    this.requests.push(now);
    this.logInfo('Updated rate limit tracking', {
      requestsInWindow: this.requests.length,
      rateLimit: this.rateLimit,
    });
  }

  /**
   * Get current monitoring statistics
   * @returns {Object} Current monitoring stats
   */
  getStats() {
    const stats = {
      quotaUsed: this.quotaUsed,
      quotaLimit: this.quotaLimit,
      quotaResetTime: this.quotaResetTime,
      rateLimit: this.rateLimit,
      rateWindowMs: this.rateWindowMs,
      requestsInWindow: this.requests.length,
    };

    this.logInfo('Retrieved monitoring stats', stats);
    return stats;
  }
}

module.exports = MonitoringProcessor;
