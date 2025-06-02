require('dotenv').config();
const winston = require('winston');
const { validateEnv } = require('./utils/env-validator');
const { STREAMS } = require('./config/constants');
const IngestionProcessor = require('./processors/ingestion-processor');
const PlatformDetector = require('./processors/platform-detector');
const ContentScraper = require('./processors/content-scraper');
const ContentSummarizer = require('./processors/content-summarizer');
const NotionProcessor = require('./processors/notion-processor');
const YouTubeProcessor = require('./processors/youtube-processor');
const MessageBus = require('./utils/MessageBus');
const { sendTelegramMessage } = require('./utils/telegram');

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Validate environment variables
validateEnv();

// Initialize message bus
const messageBus = new MessageBus(process.env.REDIS_URL);

// Initialize workflow processors
const ingestionProcessor = new IngestionProcessor(process.env.TELEGRAM_BOT_TOKEN);
const platformDetector = new PlatformDetector();
const contentScraper = new ContentScraper();
const contentSummarizer = new ContentSummarizer(process.env.GEMINI_API_KEY);
const notionProcessor = new NotionProcessor(process.env.NOTION_API_KEY);
const youtubeProcessor = new YouTubeProcessor(process.env.YOUTUBE_API_KEY);

// Set up message flow
async function setupMessageFlow() {
  // Clear all existing streams before starting
  await messageBus.clearStreams();

  // Ingestion -> Platform Detection
  messageBus.subscribe(
    STREAMS.INGESTION,
    'platform-detection-group',
    'platform-detection-1',
    async (message) => {
      const result = await platformDetector.processMessage(message);
      if (message.chatId && result.platform) {
        await sendTelegramMessage(message.chatId, `🔎 Platform detected: ${result.platform}`);
      }
      await messageBus.publish(STREAMS.PLATFORM_DETECTION, result);
    },
  );

  // Platform Detection -> YouTube or Content Scraping
  messageBus.subscribe(
    STREAMS.PLATFORM_DETECTION,
    'content-fetching-group',
    'content-fetching-1',
    async (message) => {
      let result;
      if (message.platform === 'youtube') {
        if (message.chatId) {
          await sendTelegramMessage(
            message.chatId,
            '🎬 Extracting video ID and metadata from YouTube...',
          );
        }
        result = await youtubeProcessor.processMessage(message);
        if (message.chatId) {
          await sendTelegramMessage(message.chatId, '📝 Analyzing transcript...');
        }
      } else {
        if (message.chatId) {
          await sendTelegramMessage(
            message.chatId,
            `🔎 Extracting content from ${message.platform}...`,
          );
        }
        result = await contentScraper.processMessage(message);
      }
      await messageBus.publish(STREAMS.SCRAPING, result);
    },
  );

  // Content Scraping/YouTube -> Summarization
  messageBus.subscribe(
    STREAMS.SCRAPING,
    'summarization-group',
    'summarization-1',
    async (message) => {
      if (message.chatId) {
        await sendTelegramMessage(message.chatId, '🤖 Starting content summarization...');
      }
      const result = await contentSummarizer.processMessage(message);
      await messageBus.publish(STREAMS.SUMMARIZATION, result);
    },
  );

  // Summarization -> Notion
  messageBus.subscribe(STREAMS.SUMMARIZATION, 'notion-group', 'notion-1', async (message) => {
    // If summarization failed, do not proceed to Notion and notify user
    if (message.summarizationFailed) {
      if (message.chatId) {
        await sendTelegramMessage(
          message.chatId,
          "⚠️ Sorry, couldn't process the link. Unable to detect the page contents for summarization.",
        );
      } else {
        logger.error('Missing chatId for summarization failure notification', { message });
      }
      return;
    }
    if (message.chatId) {
      await sendTelegramMessage(message.chatId, '🗂️ Saving to Notion...');
    }
    await notionProcessor.processMessage(message);
    // Do not send the final success message here; NotionProcessor handles it.
  });

  // Update IngestionProcessor to use message bus
  ingestionProcessor.setMessageBus(messageBus);
}

// Log startup
logger.info('Omnichannel Bot is starting...');

// Initialize message flow
setupMessageFlow().catch((error) => {
  logger.error('Error setting up message flow', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
