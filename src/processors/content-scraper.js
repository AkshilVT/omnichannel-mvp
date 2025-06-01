const BaseProcessor = require('./base-processor');
const { chromium } = require('playwright');

class ContentScraper extends BaseProcessor {
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
  }

  async processMessage(message) {
    try {
      const { url, platform } = message;
      this.logInfo('Starting content scraping', { url, platform });

      const scraper = this.scrapers[platform] || this.scrapers.unknown;
      const content = await scraper(url);

      return {
        ...message,
        content,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.handleError(error, { url: message.url, platform: message.platform });
    }
  }

  async scrapeYoutube(url) {
    // TODO: Implement YouTube API integration
    return {
      type: 'youtube',
      url,
      title: 'YouTube Video',
      description: 'Video description will be extracted here',
      duration: '0:00',
      channel: 'Channel name',
    };
  }

  async scrapeInstagram(url) {
    // TODO: Implement Instagram scraping
    return {
      type: 'instagram',
      url,
      caption: 'Post caption will be extracted here',
      mediaType: 'image/video',
      username: 'instagram_username',
    };
  }

  async scrapeTwitter(url) {
    // TODO: Implement Twitter API integration
    return {
      type: 'twitter',
      url,
      text: 'Tweet content will be extracted here',
      author: 'twitter_username',
      timestamp: new Date().toISOString(),
    };
  }

  async scrapeLinkedIn(url) {
    // TODO: Implement LinkedIn API integration
    // For now, return basic structure
    return {
      type: 'linkedin',
      url,
      title: 'LinkedIn Post',
      description: 'Post content will be extracted here',
      author: 'linkedin_user',
      timestamp: new Date().toISOString(),
    };
  }

  async scrapeArticle(url) {
    // Use Playwright to fetch and extract article content
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    const title = await page.title();
    // Try to extract meta description
    const description = await page
      .$eval('meta[name="description"]', (el) => el.content)
      .catch(() => 'No description available');
    // Try to extract author
    const author = await page
      .$eval('meta[name="author"]', (el) => el.content)
      .catch(() => 'Unknown');
    // Try to extract published date
    const publishedAt = await page
      .$eval('meta[property="article:published_time"]', (el) => el.content)
      .catch(() => new Date().toISOString());
    await browser.close();
    return {
      type: 'article',
      url,
      title,
      description,
      content: html,
      author,
      publishedAt,
    };
  }

  async scrapeGeneric(url) {
    // Use Playwright to fetch and extract generic page content
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    const title = await page.title();
    const description = await page
      .$eval('meta[name="description"]', (el) => el.content)
      .catch(() => 'No description available');
    await browser.close();
    return {
      type: 'generic',
      url,
      title,
      description,
      content: html,
    };
  }

  extractMetaTag(html, name) {
    const regex = new RegExp(
      `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      'i',
    );
    const match = html.match(regex);
    return match ? match[1] : null;
  }
}

module.exports = ContentScraper;
