/**
 * Application constants and configuration
 * Centralized configuration for the application
 */

/**
 * Message bus stream names
 * @type {Object.<string, string>}
 */
const STREAMS = {
  /** Stream for initial content ingestion */
  INGESTION: 'stream:ingestion',
  /** Stream for platform detection */
  PLATFORM_DETECTION: 'stream:platform-detection',
  /** Stream for content scraping */
  SCRAPING: 'stream:scraping',
  /** Stream for content summarization */
  SUMMARIZATION: 'stream:summarization',
  /** Stream for Notion integration */
  NOTION: 'stream:notion',
};

/**
 * Regular expressions for platform detection
 * @type {Object.<string, RegExp>}
 */
const PLATFORM_PATTERNS = {
  /** YouTube video platform */
  YOUTUBE: /(?:youtube\.com|youtu\.be)/,
  /** Instagram social media platform */
  INSTAGRAM: /(?:instagram\.com|instagr\.am)/,
  /** Twitter/X social media platform */
  TWITTER: /(?:twitter\.com|x\.com)/,
  /** LinkedIn professional network */
  LINKEDIN: /(?:linkedin\.com)/,
  /** Article and documentation platforms */
  ARTICLE: /(?:medium\.com|dev\.to|github\.com|wikipedia\.org)/,
};

/**
 * Required environment variables
 * @type {string[]}
 */
const REQUIRED_ENV_VARS = [
  /** Telegram bot authentication token */
  'TELEGRAM_BOT_TOKEN',
  /** Notion API authentication key */
  'NOTION_API_KEY',
  /** Google Gemini API key */
  'GEMINI_API_KEY',
  /** Redis connection URL */
  'REDIS_URL',
];

/**
 * Cache configuration
 * @type {Object}
 */
const CACHE_CONFIG = {
  /** Default cache TTL in seconds */
  DEFAULT_TTL: 3600,
  /** Cache key prefix */
  KEY_PREFIX: 'cache_',
};

/**
 * API rate limiting configuration
 * @type {Object}
 */
const RATE_LIMIT_CONFIG = {
  /** Maximum requests per window */
  MAX_REQUESTS: 100,
  /** Rate limit window in milliseconds */
  WINDOW_MS: 60000,
};

/**
 * Logging configuration
 * @type {Object}
 */
const LOG_CONFIG = {
  /** Default log level */
  DEFAULT_LEVEL: 'info',
  /** Maximum log file size in bytes */
  MAX_FILE_SIZE: 5242880, // 5MB
  /** Maximum number of log files to keep */
  MAX_FILES: 5,
};

module.exports = {
  STREAMS,
  PLATFORM_PATTERNS,
  REQUIRED_ENV_VARS,
  CACHE_CONFIG,
  RATE_LIMIT_CONFIG,
  LOG_CONFIG,
};
