/**
 * Content Summarizer
 *
 * A processor that uses Google's Gemini AI to generate structured summaries and tags
 * from various types of content. It handles rate limiting, retries, and error cases
 * gracefully while providing user feedback through Telegram.
 */
const BaseProcessor = require('./base-processor');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { sendTelegramMessage } = require('../utils/telegram');
const extractLinks = require('../utils/extractLinks');
const { AppError } = require('../utils/errors/AppError');

class ContentSummarizer extends BaseProcessor {
  /**
   * Creates a new ContentSummarizer instance
   * @param {string} apiKey - Google API key for Gemini AI
   * @throws {AppError} If API key is missing
   */
  constructor(apiKey) {
    super();
    if (!apiKey) {
      throw new AppError('GOOGLE_API_KEY is required', 'INVALID_CONFIG');
    }

    // Initialize the LLM with the correct configuration and retry settings
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash',
      maxOutputTokens: 2048,
      temperature: 0.7,
      apiKey: apiKey,
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds initial delay
    });

    // Create a single prompt template for structured output
    this.structuredPrompt = PromptTemplate.fromTemplate(
      `You are an intelligent content summarizer and tagger. Given the following content, return a JSON object with two fields: "summary" (a concise 3-5 sentence summary of the main points and key takeaways) and "tags" (an array of 5-7 relevant tags that best categorize the content).\n\nIf you are unable to access the content or face any errors, respond ONLY with the following format:\n{{{{\"error\": \"error message here\"}}}}\n\nContent: {content}\n\nRespond ONLY with a valid JSON object in the format below, and DO NOT include any Markdown formatting, code block markers, or extra text before or after the JSON:\n{{{{\n  \"summary\": \"...\",\n  \"tags\": [\"tag1\", \"tag2\", ...]\n}}}}`,
    );
  }

  /**
   * Processes a message to generate a summary and tags
   * @param {Object} message - The message to process
   * @param {string} message.content - The content to summarize
   * @param {string} message.platform - The platform the content is from
   * @param {Object} [message.data] - Additional data for summarization
   * @param {string} [message.chatId] - Telegram chat ID for notifications
   * @returns {Promise<Object>} The processed message with summary and tags
   * @throws {AppError} If content is missing or processing fails
   */
  async process(message) {
    const { content, platform, data, chatId } = message;
    const summaryContent = content ?? data;

    if (!summaryContent) {
      throw new AppError('No content provided for summarization', 'INVALID_INPUT');
    }

    this.logInfo('Received content for summarization', {
      platform,
      content: JSON.stringify(summaryContent).slice(0, 200),
    });

    try {
      await sendTelegramMessage(chatId, `🔎 Analyzing content from *${platform}*...`);

      // Generate structured summary and tags in one call
      this.logInfo('Starting structured summary+tags generation', { platform });
      await sendTelegramMessage(chatId, '✍️ Generating summary and tags (structured output)...');

      const prompt = await this.structuredPrompt.format({
        content: JSON.stringify(summaryContent, null, 2),
      });

      const response = await this.llm.invoke(prompt);
      const parsed = await this.parseLLMResponse(response.content, platform, chatId);

      if (parsed.error) {
        return this.createErrorResponse(message, parsed.error, platform);
      }

      // Extract resources (links) from the content
      const resources = extractLinks(
        typeof summaryContent === 'string' ? summaryContent : JSON.stringify(summaryContent),
      );

      // Normal case: extract summary and tags
      this.logInfo('Generated summary and tags (structured)', {
        summary: parsed.summary,
        tags: parsed.tags,
        resources,
      });

      await sendTelegramMessage(chatId, '✅ Summary and tags generated.');
      await sendTelegramMessage(chatId, '📝 Saving to Notion...');

      return {
        ...message,
        summary: parsed.summary,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [platform, 'unprocessed'],
        resources,
        summarizedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logInfo('Error in summarization process', {
        error: error.message,
        stack: error.stack,
        platform: message.platform,
      });

      await sendTelegramMessage(chatId, `❌ Summarization process failed: ${error.message}`);

      return this.createErrorResponse(message, error.message, platform);
    }
  }

  /**
   * Processes a message with retry logic for rate limiting
   * @param {Object} message - The message to process
   * @param {string} message.content - The content to summarize
   * @param {string} [message.url] - The URL of the content
   * @param {string} [message.chatId] - Telegram chat ID for notifications
   * @returns {Promise<Object>} The processed message with summary and tags
   * @throws {AppError} If processing fails after retries
   */
  async processMessage(message) {
    try {
      const { content, url, chatId } = message;
      this.logInfo('Starting content summarization', { url });

      // Extract any links from the content
      const resources = extractLinks(content);

      // Notify user about rate limit handling
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          '⏳ Processing content (this may take a moment due to rate limits)...',
        );
      }

      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;

      while (retryCount < maxRetries) {
        try {
          const result = await this.llm.invoke(await this.structuredPrompt.format({ content }));

          const parsed = await this.parseLLMResponse(result.content, null, chatId);

          if (parsed.error) {
            throw new AppError(parsed.error, 'LLM_ERROR');
          }

          return {
            ...message,
            summary: parsed.summary,
            tags: parsed.tags,
            resources,
          };
        } catch (error) {
          lastError = error;
          if (error.status === 429) {
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            this.logInfo('Rate limit hit, retrying after delay', {
              retryCount,
              retryDelay,
              error: error.message,
            });

            if (chatId) {
              await sendTelegramMessage(
                chatId,
                `⏳ Rate limit reached. Retrying in ${retryDelay / 1000} seconds...`,
              );
            }

            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retryCount++;
          } else {
            throw error;
          }
        }
      }

      // If we've exhausted retries, return a fallback response
      this.logInfo('Max retries reached, returning fallback response', {
        error: lastError.message,
      });

      if (chatId) {
        await sendTelegramMessage(
          chatId,
          '⚠️ Unable to generate summary due to rate limits. Please try again in a few minutes.',
        );
      }

      return {
        ...message,
        summary: 'Summary generation temporarily unavailable due to rate limits.',
        tags: ['unprocessed', 'rate-limited'],
        resources,
        error: lastError.message,
      };
    } catch (error) {
      await this.handleError(error, { url: message.url });
      throw error;
    }
  }

  /**
   * Parses the LLM response into a structured object
   * @private
   * @param {string} content - The raw LLM response content
   * @param {string} [platform] - The platform the content is from
   * @param {string} [chatId] - Telegram chat ID for notifications
   * @returns {Promise<Object>} The parsed response object
   */
  async parseLLMResponse(content, platform, chatId) {
    try {
      let cleanedContent = content.trim();

      // Remove Markdown code block if present
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent
          .replace(/^```[a-zA-Z]*\n?/, '')
          .replace(/```$/, '')
          .trim();
      }

      // Remove any leading/trailing non-JSON content
      const firstBrace = cleanedContent.indexOf('{');
      const lastBrace = cleanedContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
      }

      // Handle double curly braces by replacing them with single braces
      cleanedContent = cleanedContent.replace(/{{/g, '{').replace(/}}/g, '}');

      return JSON.parse(cleanedContent);
    } catch (error) {
      this.logInfo('Error parsing LLM response', {
        error: error.message,
        response: content,
      });

      if (chatId) {
        await sendTelegramMessage(
          chatId,
          '⚠️ Sorry, could not process the link. LLM did not return valid JSON.',
        );
      }

      throw new AppError('Failed to parse LLM response', 'PARSE_ERROR', { originalError: error });
    }
  }

  /**
   * Creates an error response object
   * @private
   * @param {Object} message - The original message
   * @param {string} errorMessage - The error message
   * @param {string} platform - The platform the content is from
   * @returns {Object} The error response object
   */
  createErrorResponse(message, errorMessage, platform) {
    return {
      ...message,
      summary: `Unable to generate summary for ${platform} content at this time. Reason: ${errorMessage}`,
      tags: [platform, 'unprocessed'],
      summarizedAt: new Date().toISOString(),
      summarizationFailed: true,
    };
  }
}

module.exports = ContentSummarizer;
