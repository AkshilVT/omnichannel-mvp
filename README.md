# Omnichannel Bot

A Telegram bot that processes shared links using AI processors, and organizes the information into
your Notion workspace.

## Features

- Process links from various platforms (YouTube, Twitter, LinkedIn, etc.)
- Extract and summarize content using AI
- Automatically organize content in Notion
- Tag and categorize content for easy retrieval

## Architecture

The system is built using a workflow-based architecture:

1. **Ingestion Processor**: Receives links from users.
2. **Platform Detector**: Identifies the type of content.
3. **Content Scraper**: Retrieves content from the source.
4. **Content Summarizer**: Processes content to extract summaries and metadata.
5. **Notion Processor**: Inserts structured data into the user's Notion workspace.

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `NOTION_API_KEY`
   - `GEMINI_API_KEY`
   - `REDIS_URL`
4. Run the bot: `npm start`

## Contributing

Contributions are welcome! Please refer to `docs/contributing.md` for guidelines.

## License

This project is licensed under the MIT License.
