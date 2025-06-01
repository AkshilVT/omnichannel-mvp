const BaseProcessor = require('./base-processor');
const TelegramBot = require('node-telegram-bot-api');

class IngestionProcessor extends BaseProcessor {
  constructor(token) {
    super();
    this.bot = new TelegramBot(token, { polling: true });
    this.setupWebhook();
  }

  setMessageBus(messageBus) {
    this.messageBus = messageBus;
  }

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

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async processMessage(message) {
    this.logInfo('---------------\n Processing new URL', { url: message.url });

    if (!this.messageBus) {
      throw new Error('MessageBus not initialized');
    }

    // Publish to ingestion stream
    await this.messageBus.publish('stream:ingestion', message);
    return message;
  }
}

module.exports = IngestionProcessor;
