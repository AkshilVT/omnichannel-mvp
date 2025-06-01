const BaseProcessor = require('./base-processor');

class MonitoringProcessor extends BaseProcessor {
  constructor({ quotaLimit = 10000, rateLimit = 100, rateWindowMs = 60000 } = {}) {
    super();
    this.quotaLimit = quotaLimit;
    this.quotaUsed = 0;
    this.quotaResetTime = this._nextMidnight();
    this.rateLimit = rateLimit;
    this.rateWindowMs = rateWindowMs;
    this.requests = [];
  }

  _nextMidnight() {
    const now = new Date();
    const reset = new Date(now);
    reset.setHours(24, 0, 0, 0);
    return reset;
  }

  checkQuota(cost = 1) {
    const now = new Date();
    if (now > this.quotaResetTime) {
      this.quotaUsed = 0;
      this.quotaResetTime = this._nextMidnight();
    }
    if (this.quotaUsed + cost > this.quotaLimit) {
      throw new Error(`Daily quota limit exceeded. Used: ${this.quotaUsed}/${this.quotaLimit}`);
    }
    this.quotaUsed += cost;
  }

  checkRateLimit() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.rateWindowMs);
    if (this.requests.length >= this.rateLimit) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    this.requests.push(now);
  }

  getStats() {
    return {
      quotaUsed: this.quotaUsed,
      quotaLimit: this.quotaLimit,
      quotaResetTime: this.quotaResetTime,
      rateLimit: this.rateLimit,
      rateWindowMs: this.rateWindowMs,
      requestsInWindow: this.requests.length,
    };
  }
}

module.exports = MonitoringProcessor;
