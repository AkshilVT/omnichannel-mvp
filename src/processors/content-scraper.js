const BaseProcessor = require('./base-processor');
const { chromium } = require('playwright');

/**
 * Scrapes content from various platforms using Playwright or API stubs
 */
class ContentScraper extends BaseProcessor {
  /**
   * Create a new ContentScraper
   */
  constructor() {
    super();
    this.scrapers = {
      youtube: this.scrapeYoutube.bind(this),
      instagram: this.scrapeInstagram.bind(this),
      twitter: this.scrapeTwitter.bind(this),
      linkedin: this.scrapeLinkedIn.bind(this),
      article: this.scrapeArticle.bind(this),
      unknown: this.scrapeGeneric.bind(this),
    };
    this.logInfo('Content scraper initialized');
  }

  /**
   * Process a message to scrape content based on platform
   * @param {Object} message - The message containing url and platform
   * @returns {Promise<Object>} The message with scraped content
   * @throws {Error} If scraping fails
   */
  async processMessage(message) {
    try {
      const { url, platform } = message;
      this.logInfo('Starting content scraping', { url, platform });

      if (!url) {
        throw new Error('URL is required for content scraping');
      }

      const scraper = this.scrapers[platform] || this.scrapers.unknown;
      const content = await scraper(url);

      this.logInfo('Content scraping completed', {
        url,
        platform,
        contentType: content.type,
      });

      return {
        ...message,
        content,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.handleError(error, { url: message.url, platform: message.platform });
      throw error;
    }
  }

  /**
   * Stub for YouTube scraping (to be implemented)
   * @param {string} url - YouTube video URL
   * @returns {Promise<Object>} Video metadata
   */
  async scrapeYoutube(url) {
    this.logInfo('YouTube scraping not implemented', { url });
    return {
      type: 'youtube',
      url,
      title: 'YouTube Video',
      description: 'Video description will be extracted here',
      duration: '0:00',
      channel: 'Channel name',
    };
  }

  /**
   * Stub for Instagram scraping (to be implemented)
   * @param {string} url - Instagram post URL
   * @returns {Promise<Object>} Post metadata
   */
  async scrapeInstagram(url) {
    this.logInfo('Instagram scraping not implemented', { url });
    return {
      type: 'instagram',
      url,
      caption: 'Post caption will be extracted here',
      mediaType: 'image/video',
      username: 'instagram_username',
    };
  }

  /**
   * Stub for Twitter scraping (to be implemented)
   * @param {string} url - Twitter post URL
   * @returns {Promise<Object>} Tweet metadata
   */
  async scrapeTwitter(url) {
    this.logInfo('Twitter scraping not implemented', { url });
    return {
      type: 'twitter',
      url,
      text: 'Tweet content will be extracted here',
      author: 'twitter_username',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Stub for LinkedIn scraping (to be implemented)
   * @param {string} url - LinkedIn post URL
   * @returns {Promise<Object>} Post metadata
   */
  async scrapeLinkedIn(url) {
    this.logInfo('LinkedIn scraping not implemented', { url });
    return {
      type: 'linkedin',
      url,
      title: 'LinkedIn Post',
      description: 'Post content will be extracted here',
      author: 'linkedin_user',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scrape an article using Playwright
   * @param {string} url - Article URL
   * @returns {Promise<Object>} Article content and metadata
   * @throws {Error} If scraping fails
   */
  async scrapeArticle(url) {
    let browser;
    try {
      this.logInfo('Starting article scraping', { url });
      browser = await chromium.launch();
      const page = await browser.newPage();

      // Set timeout for navigation
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const [title, description, author, publishedAt] = await Promise.all([
        page.title(),
        this._extractMetaContent(page, 'meta[name="description"]'),
        this._extractMetaContent(page, 'meta[name="author"]'),
        this._extractMetaContent(page, 'meta[property="article:published_time"]'),
      ]);

      const html = await page.content();
      const content = {
        type: 'article',
        url,
        title,
        description: description || 'No description available',
        content: html,
        author: author || 'Unknown',
        publishedAt: publishedAt || new Date().toISOString(),
      };

      this.logInfo('Article scraping completed', {
        url,
        title,
        hasDescription: !!description,
        hasAuthor: !!author,
        hasPublishedAt: !!publishedAt,
      });

      return content;
    } catch (error) {
      this.logError('Article scraping failed', {
        url,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Scrape a generic web page using Playwright
   * @param {string} url - Web page URL
   * @returns {Promise<Object>} Page content and metadata
   * @throws {Error} If scraping fails
   */
  async scrapeGeneric(url) {
    let browser;
    try {
      this.logInfo('Starting generic page scraping', { url });
      browser = await chromium.launch();
      const page = await browser.newPage();

      // Set timeout for navigation
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const [title, description] = await Promise.all([
        page.title(),
        this._extractMetaContent(page, 'meta[name="description"]'),
      ]);

      const html = await page.content();
      const content = {
        type: 'generic',
        url,
        title,
        description: description || 'No description available',
        content: html,
      };

      this.logInfo('Generic page scraping completed', {
        url,
        title,
        hasDescription: !!description,
      });

      return content;
    } catch (error) {
      this.logError('Generic page scraping failed', {
        url,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Extract content from a meta tag
   * @private
   * @param {Page} page - Playwright page object
   * @param {string} selector - Meta tag selector
   * @returns {Promise<string|null>} Meta tag content or null if not found
   */
  async _extractMetaContent(page, selector) {
    try {
      return await page.$eval(selector, (el) => el.content);
    } catch (error) {
      return null;
    }
  }
}

module.exports = ContentScraper;
