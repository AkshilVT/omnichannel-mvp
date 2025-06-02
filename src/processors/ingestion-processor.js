const BaseProcessor = require('./base-processor');
const TelegramBot = require('node-telegram-bot-api');

/**
 * Processes incoming messages from Telegram
 * Extracts URLs and initiates the workflow
 */
class IngestionProcessor extends BaseProcessor {
  /**
   * Create a new IngestionProcessor
   * @param {string} token - The Telegram bot token
   */
  constructor(token) {
    super();
    this.bot = new TelegramBot(token, { polling: true });
    this.setupWebhook();
  }

  /**
   * Set the message bus for publishing messages
   * @param {MessageBus} messageBus - The message bus instance
   */
  setMessageBus(messageBus) {
    this.messageBus = messageBus;
  }

  /**
   * Set up the Telegram webhook to handle incoming messages
   */
  setupWebhook() {
    this.bot.on('message', async (msg) => {
      try {
        if (msg.text && this.isValidUrl(msg.text)) {
          const message = {
            userId: msg.from.id,
            chatId: msg.chat.id,
            url: msg.text,
            timestamp: new Date().toISOString(),
          };

          // Send acknowledgment to user
          await this.bot.sendMessage(msg.chat.id, 'Processing your link...');

          // Process and publish to message bus
          await this.processMessage(message);
        }
      } catch (error) {
        await this.handleError(error, { messageId: msg.message_id });
        // Notify user of error
        await this.bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your link.');
      }
    });
  }

  /**
   * Check if a string is a valid URL
   * @param {string} string - The string to check
   * @returns {boolean} True if the string is a valid URL
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Process a message and publish it to the message bus
   * @param {Object} message - The message to process
   * @returns {Promise<Object>} The processed message
   * @throws {Error} If the message bus is not initialized
   */
  async processMessage(message) {
    this.logInfo('Processing new URL', { url: message.url });

    if (!this.messageBus) {
      const error = new Error('MessageBus not initialized');
      this.logError('MessageBus not initialized', { message });
      throw error;
    }

    // Publish to ingestion stream
    await this.messageBus.publish('stream:ingestion', message);
    return message;
  }
}

module.exports = IngestionProcessor;
