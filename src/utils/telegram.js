const { Telegraf } = require('telegraf');
const winston = require('winston');
const { LOG_CONFIG } = require('../config/constants');

/**
 * Custom error class for Telegram-related errors
 */
class TelegramError extends Error {
  /**
   * Create a new TelegramError
   * @param {string} message - Error message
   * @param {Error} [originalError] - Original error that caused this error
   */
  constructor(message, originalError = null) {
    super(message);
    this.name = 'TelegramError';
    this.originalError = originalError;
  }
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || LOG_CONFIG.DEFAULT_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'telegram-bot' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      maxsize: LOG_CONFIG.MAX_FILE_SIZE,
      maxFiles: LOG_CONFIG.MAX_FILES,
    }),
    new winston.transports.File({
      filename: 'combined.log',
      maxsize: LOG_CONFIG.MAX_FILE_SIZE,
      maxFiles: LOG_CONFIG.MAX_FILES,
    }),
  ],
});

// Handle uncaught exceptions and rejections
logger.exceptions.handle(new winston.transports.File({ filename: 'exceptions.log' }));
logger.rejections.handle(new winston.transports.File({ filename: 'rejections.log' }));

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot;

/**
 * Initialize the Telegram bot
 * @throws {TelegramError} If bot initialization fails
 */
function initializeBot() {
  if (!token) {
    throw new TelegramError('TELEGRAM_BOT_TOKEN is not set');
  }

  try {
    bot = new Telegraf(token);
    logger.info('Telegram bot initialized successfully');

    // Set up error handling
    bot.catch((err, ctx) => {
      logger.error('Telegram bot error', {
        error: err.message,
        stack: err.stack,
        update: ctx.update,
      });
    });

    return bot;
  } catch (error) {
    logger.error('Failed to initialize Telegram bot', {
      error: error.message,
      stack: error.stack,
    });
    throw new TelegramError('Failed to initialize Telegram bot', error);
  }
}

/**
 * Send a message to a Telegram chat
 * @param {string|number} chatId - The chat ID to send the message to
 * @param {string} message - The message to send
 * @param {Object} [options] - Additional options for sending the message
 * @param {string} [options.parse_mode='Markdown'] - Message parse mode
 * @returns {Promise<void>}
 * @throws {TelegramError} If message sending fails
 */
async function sendTelegramMessage(chatId, message, options = {}) {
  if (!bot) {
    throw new TelegramError('Telegram bot is not initialized');
  }

  if (!chatId) {
    throw new TelegramError('chatId is required');
  }

  if (!message) {
    throw new TelegramError('message is required');
  }

  try {
    const defaultOptions = { parse_mode: 'Markdown' };
    await bot.telegram.sendMessage(chatId, message, {
      ...defaultOptions,
      ...options,
    });
    logger.info('Telegram message sent successfully', { chatId });
  } catch (error) {
    logger.error('Failed to send Telegram message', {
      error: error.message,
      stack: error.stack,
      chatId,
    });
    throw new TelegramError('Failed to send Telegram message', error);
  }
}

// Initialize bot if token is available
if (token) {
  try {
    initializeBot();
  } catch (error) {
    logger.error('Failed to initialize Telegram bot', {
      error: error.message,
      stack: error.stack,
    });
  }
}

module.exports = {
  sendTelegramMessage,
  bot,
  initializeBot,
  TelegramError,
};
