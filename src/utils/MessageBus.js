const Redis = require('ioredis');
const { STREAMS } = require('../config/constants');
const winston = require('winston');

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

class MessageBus {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.streams = STREAMS;
  }

  async clearStreams() {
    try {
      // Delete all streams
      for (const stream of Object.values(this.streams)) {
        await this.redis.del(stream);
      }
      logger.info('All message bus streams cleared successfully');
    } catch (error) {
      logger.error('Error clearing message bus streams', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async publish(stream, message) {
    try {
      const messageId = await this.redis.xadd(stream, '*', 'message', JSON.stringify(message));
      return messageId;
    } catch (error) {
      logger.error(`Error publishing to stream ${stream}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async subscribe(stream, consumerGroup, consumerName, callback) {
    try {
      // Create consumer group if it doesn't exist
      try {
        await this.redis.xgroup('CREATE', stream, consumerGroup, '0', 'MKSTREAM');
      } catch (error) {
        if (!error.message.includes('BUSYGROUP')) {
          throw error;
        }
      }

      // Start consuming messages
      while (true) {
        const messages = await this.redis.xreadgroup(
          'GROUP',
          consumerGroup,
          consumerName,
          'COUNT',
          1,
          'BLOCK',
          2000,
          'STREAMS',
          stream,
          '>',
        );

        if (messages) {
          for (const [streamName, streamMessages] of messages) {
            for (const [messageId, messageData] of streamMessages) {
              const message = JSON.parse(messageData[1]);
              await callback(message, messageId);
              // Acknowledge the message
              await this.redis.xack(streamName, consumerGroup, messageId);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Error in subscription to stream ${stream}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getPendingMessages(stream, consumerGroup) {
    try {
      const pending = await this.redis.xpending(stream, consumerGroup, '-', '+', 100);
      return pending;
    } catch (error) {
      logger.error(`Error getting pending messages from stream ${stream}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async claimPendingMessage(stream, consumerGroup, consumerName, messageId) {
    try {
      const claimed = await this.redis.xclaim(stream, consumerGroup, consumerName, 0, messageId);
      return claimed;
    } catch (error) {
      logger.error(`Error claiming message ${messageId} from stream ${stream}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = MessageBus;
