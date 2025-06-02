# Error Handling System

## Overview

The Omnichannel Bot implements a robust error handling system using custom error classes and
standardized error handling patterns across all processors.

## Error Classes

### AppError

The base error class for application-specific errors. It provides:

- Structured error information with error codes
- Context about where and why the error occurred
- Timestamp of when the error occurred
- Original error capture for debugging
- JSON serialization support

```javascript
throw new AppError('Error message', 'ERROR_CODE', {
  context: 'Additional context',
  originalError: error,
});
```

### EnvValidationError

Specialized error for environment variable validation:

- Lists missing environment variables
- Provides clear error messages for configuration issues

### TelegramError

Handles Telegram-specific errors:

- Bot initialization failures
- Message sending errors
- Connection issues

## Error Handling Patterns

### 1. Processor Error Handling

All processors extend `BaseProcessor` which provides:

- Standardized error logging
- Error context capture
- Stack trace preservation
- Error propagation

### 2. Rate Limiting and Retries

The system implements smart retry logic for:

- API rate limits
- Network failures
- Temporary service unavailability

Example:

```javascript
try {
  // Operation that might hit rate limits
} catch (error) {
  if (error.status === 429) {
    // Implement exponential backoff
    await retryWithBackoff();
  } else {
    throw error;
  }
}
```

### 3. Error Recovery

The system implements graceful degradation:

- Fallback responses when services are unavailable
- Cached responses when possible
- User-friendly error messages
- Detailed logging for debugging

## Logging

All errors are logged with:

- Error message and code
- Stack trace
- Context information
- Timestamp
- Service identifier

Logs are written to:

- Console (development)
- Error log file
- Combined log file
- Exception log file
- Rejection log file

## Best Practices

1. Always use custom error classes for application errors
2. Include relevant context in error objects
3. Log errors with appropriate severity levels
4. Implement retry logic for transient failures
5. Provide user-friendly error messages
6. Preserve original error information
7. Use error codes for error categorization
8. Handle errors at the appropriate level

## Error Codes

Common error codes used in the system:

- `INVALID_CONFIG`: Configuration errors
- `INVALID_INPUT`: Invalid user input
- `API_ERROR`: External API failures
- `RATE_LIMIT`: Rate limit exceeded
- `PARSE_ERROR`: Data parsing failures
- `NETWORK_ERROR`: Network-related issues
- `AUTH_ERROR`: Authentication failures
- `VALIDATION_ERROR`: Data validation failures
