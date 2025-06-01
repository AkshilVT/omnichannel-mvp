# Architecture Overview

Omnichannel Bot utilizes a workflow-based system to process and organize shared links.

## Processors

The system consists of several specialized processors:

- **Ingestion Processor**: Interfaces with users via Telegram.
- **Platform Detector**: Determines the type of content shared.
- **Content Scraper**: Extracts content from the source link.
- **Content Summarizer**: Uses AI to summarize and tag content.
- **Notion Processor**: Inserts the processed data into Notion.

## Workflow

1. User shares a link via Telegram.
2. Ingestion Processor receives and forwards the link.
3. Platform Detector identifies the content type.
4. Content Scraper retrieves the content.
5. Content Summarizer processes the content.
6. Notion Processor updates the user's Notion workspace.
