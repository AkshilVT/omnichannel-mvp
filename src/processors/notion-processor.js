const BaseProcessor = require('./base-processor');
const { Client } = require('@notionhq/client');
const { sendTelegramMessage } = require('../utils/telegram');
const { AppError } = require('../utils/errors/AppError');

/**
 * Processes content and creates pages in Notion
 * Handles database creation and page formatting
 */
class NotionProcessor extends BaseProcessor {
  /**
   * Create a new NotionProcessor
   * @param {string} apiKey - The Notion API key
   * @throws {AppError} If API key is not provided
   */
  constructor(apiKey) {
    super();
    if (!apiKey) {
      throw new AppError('Notion API key is required', 'NOTION_API_KEY_MISSING');
    }
    this.notion = new Client({ auth: apiKey });
    this.logInfo('Notion processor initialized');
  }

  /**
   * Process a message and create a Notion page
   * @param {Object} message - The message containing content to process
   * @returns {Promise<Object>} The processed message with Notion page ID
   * @throws {AppError} If processing fails
   */
  async processMessage(message) {
    try {
      const { platform, title, url, summary, tags, resources, chatId } = message;
      this.logInfo('Processing message for Notion', { platform, url });

      if (!platform) {
        throw new AppError('Platform is required', 'PLATFORM_MISSING');
      }

      if (!url) {
        throw new AppError('URL is required', 'URL_MISSING');
      }

      // Get or create database for the platform
      const databaseId = await this.getOrCreateDatabase(platform);
      this.logInfo('Got database ID', { databaseId, platform });

      // Create the page in Notion
      const pageTitle = this.formatPageTitle(title, summary);
      const page = await this.createPage(databaseId, {
        title: pageTitle,
        url,
        summary,
        tags: tags || [],
        platform,
        content: this.formatContent(message),
        createdAt: new Date().toISOString(),
        resources: resources || [],
      });

      this.logInfo('Created Notion page', { pageId: page.id, platform });

      // Notify user of success
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `✅ Content saved to Notion!\n\nTitle: ${pageTitle}\nPlatform: ${platform}`,
        );
      }

      return {
        ...message,
        notionPageId: page.id,
        integratedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.handleError(error, { platform: message.platform });
      throw error;
    }
  }

  /**
   * Get or create a Notion database for a specific platform
   * @param {string} platform - The platform name
   * @returns {Promise<string>} The database ID
   * @throws {AppError} If database operation fails
   */
  async getOrCreateDatabase(platform) {
    try {
      // Search for existing database
      const response = await this.notion.search({
        query: `Omnichannel ${platform}`,
        filter: {
          property: 'object',
          value: 'database',
        },
      });

      if (response.results.length > 0) {
        this.logInfo('Found existing database', { databaseId: response.results[0].id });
        return response.results[0].id;
      }

      this.logInfo('Creating new database', { platform });

      // Create new database if not found
      const database = await this.notion.databases.create({
        parent: {
          type: 'page_id',
          page_id: process.env.NOTION_ROOT_PAGE_ID,
        },
        title: [
          {
            type: 'text',
            text: {
              content: `Omnichannel ${platform}`,
            },
          },
        ],
        properties: {
          Title: {
            title: {},
          },
          URL: {
            url: {},
          },
          Summary: {
            rich_text: {},
          },
          Tags: {
            multi_select: {
              options: [],
            },
          },
          Platform: {
            select: {
              options: [
                { name: 'article', color: 'blue' },
                { name: 'youtube', color: 'red' },
                { name: 'instagram', color: 'purple' },
                { name: 'twitter', color: 'green' },
                { name: 'linkedin', color: 'blue' },
                { name: 'unknown', color: 'gray' },
              ],
            },
          },
          CreatedAt: {
            date: {},
          },
          Resources: {
            rich_text: {},
          },
        },
      });

      this.logInfo('Created new database', { databaseId: database.id });
      return database.id;
    } catch (error) {
      this.logError('Error in database operation', {
        error: error.message,
        platform,
        stack: error.stack,
      });
      throw new AppError('Failed to get or create database', 'DATABASE_OPERATION_FAILED', {
        platform,
        originalError: error,
      });
    }
  }

  /**
   * Create a new page in a Notion database
   * @param {string} databaseId - The database ID
   * @param {Object} data - The page data
   * @returns {Promise<Object>} The created page
   * @throws {AppError} If page creation fails
   */
  async createPage(databaseId, data) {
    try {
      const page = await this.notion.pages.create({
        parent: {
          database_id: databaseId,
        },
        properties: {
          Title: {
            title: [
              {
                text: {
                  content: data.title,
                },
              },
            ],
          },
          URL: {
            url: data.url,
          },
          Summary: {
            rich_text: [
              {
                text: {
                  content: data.summary || '',
                },
              },
            ],
          },
          Tags: {
            multi_select: data.tags.map((tag) => ({ name: tag })),
          },
          Platform: {
            select: {
              name: data.platform,
            },
          },
          CreatedAt: {
            date: {
              start: data.createdAt,
            },
          },
          Resources: {
            rich_text: data.resources.length
              ? data.resources.map((url) => ({ text: { content: url + '\n', link: { url } } }))
              : [{ text: { content: 'No resources found.' } }],
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: data.content,
                  },
                },
              ],
            },
          },
        ],
      });

      return page;
    } catch (error) {
      this.logError('Error creating Notion page', {
        error: error.message,
        databaseId,
        stack: error.stack,
      });
      throw new AppError('Failed to create Notion page', 'PAGE_CREATION_FAILED', {
        databaseId,
        originalError: error,
      });
    }
  }

  /**
   * Format content based on platform type
   * @param {Object} content - The content to format
   * @returns {string} Formatted content
   */
  formatContent(content) {
    try {
      switch (content.type) {
        case 'article':
          return `Author: ${content.author}\nPublished: ${content.publishedAt}\n\n${content.description}`;
        case 'youtube':
          return `Channel: ${content.channel}\nDuration: ${content.duration}\n\n${content.description}`;
        case 'instagram':
          return `Username: ${content.username}\nMedia Type: ${content.mediaType}\n\n${content.caption}`;
        case 'twitter':
          return `Author: ${content.author}\nPosted: ${content.timestamp}\n\n${content.text}`;
        case 'linkedin':
          return `Author: ${content.author}\nPosted: ${content.timestamp}\n\n${content.description}`;
        default:
          return content.description || 'No content available';
      }
    } catch (error) {
      this.logError('Error formatting content', {
        error: error.message,
        contentType: content.type,
        stack: error.stack,
      });
      return 'Error formatting content';
    }
  }

  /**
   * Format the page title, removing markdown and ensuring it's not empty
   * @param {string} title - The original title
   * @param {string} summary - The content summary
   * @returns {string} Formatted title
   */
  formatPageTitle(title, summary) {
    try {
      let pageTitle = (title && title.trim()) || '';
      if (!pageTitle && summary) {
        // Use the first line of the summary as title if no title is present
        pageTitle = summary.split('\n')[0].slice(0, 100).trim();
      }
      if (!pageTitle) {
        pageTitle = 'Untitled';
      }
      // Remove markdown formatting from title
      return pageTitle
        .replace(/[#*_`~>\[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      this.logError('Error formatting page title', {
        error: error.message,
        title,
        stack: error.stack,
      });
      return 'Untitled';
    }
  }
}

module.exports = NotionProcessor;
