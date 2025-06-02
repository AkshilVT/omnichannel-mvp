# Architecture Overview

Omnichannel Bot utilizes a workflow-based system to process and organize shared links.

## Core Components

### Processors

The system consists of several specialized processors:

- **Ingestion Processor**: Interfaces with users via Telegram.
- **Platform Detector**: Determines the type of content shared.
- **Content Scraper**: Extracts content from the source link.
- **Content Summarizer**: Uses AI to summarize and tag content.
- **Notion Processor**: Inserts the processed data into Notion.
- **Monitoring Processor**: Handles API quota and rate limiting.
- **Redis Cache Processor**: Manages content caching.

### Base Infrastructure

- **BaseProcessor**: Provides common functionality for all processors:

  - Standardized logging
  - Error handling
  - Context management
  - Performance monitoring

- **Error Handling System**:

  - Custom error classes (AppError, EnvValidationError, TelegramError)
  - Structured error information
  - Error recovery mechanisms
  - Retry logic for transient failures

- **Logging System**:
  - Multi-level logging (info, warning, error, debug)
  - Structured log format
  - Multiple output destinations
  - Error tracking and monitoring

## Workflow

1. User shares a link via Telegram.
2. Ingestion Processor receives and forwards the link.
3. Platform Detector identifies the content type.
4. Content Scraper retrieves the content.
5. Content Summarizer processes the content.
6. Notion Processor updates the user's Notion workspace.

## Error Handling Flow

1. Errors are caught at the processor level
2. Context is captured and logged
3. Retry logic is applied for transient failures
4. User-friendly error messages are sent
5. Detailed error information is preserved for debugging

## Logging Flow

1. All operations are logged with appropriate context
2. Errors are logged with stack traces and context
3. Performance metrics are tracked
4. Logs are written to multiple destinations
5. Log rotation and size limits are enforced

## Configuration

The system uses a centralized configuration:

- Environment variables for sensitive data
- Constants for application settings
- Logging configuration
- Cache settings
- Rate limiting parameters
