const { createClient } = require('redis');
const BaseProcessor = require('./base-processor');

class RedisCacheProcessor extends BaseProcessor {
  constructor(redisUrl = process.env.REDIS_URL, prefix = 'cache_', defaultTTL = 3600) {
    super();
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
    this.client = createClient({ url: redisUrl });
    this.client.connect().catch((err) => this.logError('Redis connection error', { error: err }));
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

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
      this.logError('Redis get error', { error: err, key });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.client.set(this._key(key), JSON.stringify(value), { EX: ttl });
      this.logInfo('Cache set', { key });
    } catch (err) {
      this.logError('Redis set error', { error: err, key });
    }
  }

  async delete(key) {
    try {
      await this.client.del(this._key(key));
      this.logInfo('Cache deleted', { key });
    } catch (err) {
      this.logError('Redis delete error', { error: err, key });
    }
  }

  async clearAll() {
    try {
      const keys = await this.client.keys(this._key('*'));
      if (keys.length) await this.client.del(keys);
      this.logInfo('All cache cleared', { prefix: this.prefix });
    } catch (err) {
      this.logError('Redis clear all cache error', { error: err });
    }
  }
}

module.exports = RedisCacheProcessor;
