const { createClient } = require('redis');
const BaseProcessor = require('./base-processor');

/**
 * Handles caching operations using Redis
 */
class RedisCacheProcessor extends BaseProcessor {
  /**
   * Create a new RedisCacheProcessor
   * @param {string} [redisUrl=process.env.REDIS_URL] - Redis connection URL
   * @param {string} [prefix='cache_'] - Prefix for cache keys
   * @param {number} [defaultTTL=3600] - Default time-to-live in seconds
   */
  constructor(redisUrl = process.env.REDIS_URL, prefix = 'cache_', defaultTTL = 3600) {
    super();
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      this.logError('Redis client error', { error: err.message });
    });

    this.client.on('connect', () => {
      this.logInfo('Redis client connected');
    });

    this.client.on('reconnecting', () => {
      this.logInfo('Redis client reconnecting');
    });

    this.client.connect().catch((err) => {
      this.logError('Redis connection error', { error: err.message });
    });
  }

  /**
   * Generate a prefixed cache key
   * @private
   * @param {string} key - Original key
   * @returns {string} Prefixed key
   */
  _key(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} Cached value or null if not found
   */
  async get(key) {
    try {
      const data = await this.client.get(this._key(key));
      if (data) {
        this.logInfo('Cache hit', { key });
        return JSON.parse(data);
      }
      this.logInfo('Cache miss', { key });
      return null;
    } catch (err) {
      this.logError('Redis get error', {
        error: err.message,
        key,
        stack: err.stack,
      });
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl=this.defaultTTL] - Time-to-live in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.set(this._key(key), serializedValue, { EX: ttl });
      this.logInfo('Cache set', {
        key,
        ttl,
        valueSize: serializedValue.length,
      });
    } catch (err) {
      this.logError('Redis set error', {
        error: err.message,
        key,
        stack: err.stack,
      });
    }
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    try {
      await this.client.del(this._key(key));
      this.logInfo('Cache deleted', { key });
    } catch (err) {
      this.logError('Redis delete error', {
        error: err.message,
        key,
        stack: err.stack,
      });
    }
  }

  /**
   * Clear all cached values with the current prefix
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      const keys = await this.client.keys(this._key('*'));
      if (keys.length) {
        await this.client.del(keys);
        this.logInfo('All cache cleared', {
          prefix: this.prefix,
          keysCleared: keys.length,
        });
      } else {
        this.logInfo('No cache keys found to clear', { prefix: this.prefix });
      }
    } catch (err) {
      this.logError('Redis clear all cache error', {
        error: err.message,
        stack: err.stack,
      });
    }
  }

  /**
   * Close the Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      await this.client.quit();
      this.logInfo('Redis connection closed');
    } catch (err) {
      this.logError('Redis close error', {
        error: err.message,
        stack: err.stack,
      });
    }
  }
}

module.exports = RedisCacheProcessor;
