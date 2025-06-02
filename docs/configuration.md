# Configuration Guide

## Environment Variables

### Required Variables

- `TELEGRAM_BOT_TOKEN`: Token for the Telegram bot.
- `NOTION_API_KEY`: API key for Notion integration.
- `GEMINI_API_KEY`: API key for Gemini services.
- `REDIS_URL`: Redis connection URL for caching.

### Optional Variables

- `LOG_LEVEL`: Logging level (default: 'info')
- `NOTION_ROOT_PAGE_ID`: Root page ID for Notion integration

## Notion Setup

1. Create a Notion integration and obtain the API key.
2. Share your Notion workspace with the integration.
3. Set up platform-specific databases with the following properties:
   - Title
   - Link
   - Summary
   - Tags
   - Source
   - Resources
   - Date Added

## Logging Configuration

The system uses Winston for logging with the following settings:

### Log Files

- `error.log`: Error-level logs
- `combined.log`: All logs
- `exceptions.log`: Uncaught exceptions
- `rejections.log`: Unhandled rejections

### Log Settings

- Maximum file size: 5MB
- Maximum files: 5
- Log format: JSON with timestamp
- Log levels: error, warn, info, debug

## Error Handling

### Error Codes

- `INVALID_CONFIG`: Configuration errors
- `INVALID_INPUT`: Invalid user input
- `API_ERROR`: External API failures
- `RATE_LIMIT`: Rate limit exceeded
- `PARSE_ERROR`: Data parsing failures
- `NETWORK_ERROR`: Network-related issues
- `AUTH_ERROR`: Authentication failures
- `VALIDATION_ERROR`: Data validation failures

### Retry Settings

- Maximum retries: 3
- Initial retry delay: 5 seconds
- Maximum retry delay: 30 seconds
- Exponential backoff: true

## Cache Configuration

### Redis Cache

- Default TTL: 3600 seconds (1 hour)
- Key prefix: 'cache\_'
- Connection timeout: 10 seconds
- Reconnection attempts: 3

## Rate Limiting

### API Quotas

- YouTube API: 10,000 units per day
- Notion API: 100 requests per minute
- Gemini API: 100 requests per minute

### Rate Limit Windows

- Default window: 60 seconds
- Maximum requests per window: 100
- Exponential backoff on rate limit
