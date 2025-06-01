const BaseProcessor = require('./base-processor');

class PlatformDetector extends BaseProcessor {
  constructor() {
    super();
    this.platformPatterns = {
      youtube: /(?:youtube\.com|youtu\.be)/,
      instagram: /(?:instagram\.com|instagr\.am)/,
      twitter: /(?:twitter\.com|x\.com)/,
      linkedin: /(?:linkedin\.com)/,
      article: /(?:medium\.com|dev\.to|github\.com|wikipedia\.org)/,
    };
  }

  async processMessage(message) {
    try {
      const platform = this.detectPlatform(message.url);
      this.logInfo('Platform detected', { url: message.url, platform });

      return {
        ...message,
        platform,
        detectedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.handleError(error, { url: message.url });
    }
  }

  detectPlatform(url) {
    for (const [platform, pattern] of Object.entries(this.platformPatterns)) {
      if (pattern.test(url)) {
        return platform;
      }
    }
    return 'unknown';
  }
}

module.exports = PlatformDetector;
