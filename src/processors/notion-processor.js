const BaseProcessor = require('./base-processor');
const { Client } = require('@notionhq/client');
const { sendTelegramMessage } = require('../utils/telegram');

class NotionProcessor extends BaseProcessor {
  constructor(apiKey) {
    super();
    this.notion = new Client({ auth: apiKey });
  }

  async process(message) {
    try {
      const { content, summary, tags, platform, url } = message;
      this.logInfo('Starting Notion integration', { platform, url });

      // Get or create the database
      const databaseId = await this.getOrCreateDatabase(platform);

      // Create the page in Notion
      let pageTitle = (message.title && message.title.trim()) || '';
      if (!pageTitle && summary) {
        // Use the first line of the summary as title if no title is present
        pageTitle = summary.split('\n')[0].slice(0, 100).trim();
      }
      if (!pageTitle) {
        pageTitle = 'Untitled';
      }
      // Remove markdown formatting from title
      pageTitle = pageTitle
        .replace(/[#*_`~>\[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const page = await this.createPage(databaseId, {
        title: pageTitle,
        url,
        summary,
        tags,
        platform,
        content: this.formatContent(content),
        createdAt: new Date().toISOString(),
        resources: message.resources || [],
      });

      return {
        ...message,
        notionPageId: page.id,
        integratedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.handleError(error, { platform: message.platform });
    }
  }

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
        return response.results[0].id;
      }

      // Create new database if not found
      const database = await this.notion.databases.create({
        parent: {
          type: 'page_id',
          page_id: process.env.NOTION_ROOT_PAGE_ID, // Make sure this is set in your .env file
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

      return database.id;
    } catch (error) {
      this.logInfo('Error in database operation', { error: error.message });
      throw error;
    }
  }

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
                  content: data.summary,
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
      this.logInfo('Error creating Notion page', { error: error.message });
      throw error;
    }
  }

  formatContent(content) {
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
  }

  async processMessage(message) {
    try {
      const { platform, title, url, summary, tags, resources, chatId } = message;
      this.logInfo('Processing message for Notion', { platform, url });

      // Get or create database for the platform
      const databaseId = await this.getOrCreateDatabase(platform);
      this.logInfo('Got database ID', { databaseId, platform });

      // Create the page in Notion
      let pageTitle = (title && title.trim()) || '';
      if (!pageTitle && summary) {
        // Use the first line of the summary as title if no title is present
        pageTitle = summary.split('\n')[0].slice(0, 100).trim();
      }
      if (!pageTitle) {
        pageTitle = 'Untitled';
      }
      // Remove markdown formatting from title
      pageTitle = pageTitle
        .replace(/[#*_`~>\[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const page = await this.createPage(databaseId, {
        title: pageTitle,
        url,
        summary,
        tags,
        platform,
        content: this.formatContent(message),
        createdAt: new Date().toISOString(),
        resources: resources || [],
      });

      this.logInfo('Created Notion page', { pageId: page.id, platform });

      // Send success message back to user
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `✅ Content saved to Notion!\nTitle: ${pageTitle}\nTags: ${(tags || []).join(', ')}`,
        );
      }

      return {
        ...message,
        notionPageId: page.id,
        notionUrl: page.url,
      };
    } catch (error) {
      await this.handleError(error, { url: message.url });
      throw error;
    }
  }
}

module.exports = NotionProcessor;
