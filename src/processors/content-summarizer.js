const BaseProcessor = require('./base-processor');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { sendTelegramMessage } = require('../utils/telegram');
const extractLinks = require('../utils/extractLinks');

class ContentSummarizer extends BaseProcessor {
  constructor(apiKey) {
    super();
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is required');
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

  async process(message) {
    const { content, platform, data, chatId } = message;
    const summaryContent = content ?? data;
    if (!summaryContent) {
      throw new Error('No content provided for summarization');
    }
    this.logInfo('Received content for summarization', {
      platform,
      content: JSON.stringify(summaryContent).slice(0, 200),
    });
    await sendTelegramMessage(chatId, `🔎 Analyzing content from *${platform}*...`);
    try {
      // Generate structured summary and tags in one call
      this.logInfo('Starting structured summary+tags generation', { platform });
      await sendTelegramMessage(chatId, '✍️ Generating summary and tags (structured output)...');
      const prompt = await this.structuredPrompt.format({
        content: JSON.stringify(summaryContent, null, 2),
      });
      const response = await this.llm.invoke(prompt);
      let parsed;
      try {
        let content = response.content.trim();
        // Remove Markdown code block if present
        if (content.startsWith('```')) {
          content = content
            .replace(/^```[a-zA-Z]*\n?/, '')
            .replace(/```$/, '')
            .trim();
        }
        // Remove any leading/trailing non-JSON content
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          content = content.substring(firstBrace, lastBrace + 1);
        }
        // Handle double curly braces by replacing them with single braces
        content = content.replace(/{{/g, '{').replace(/}}/g, '}');
        parsed = JSON.parse(content);
      } catch (jsonError) {
        this.logInfo('Error parsing LLM JSON response', {
          error: jsonError.message,
          response: response.content,
        });
        await sendTelegramMessage(
          chatId,
          '⚠️ Sorry, could not process the link. LLM did not return valid JSON.',
        );
        return {
          ...message,
          summary: 'Unable to parse LLM response as JSON.',
          tags: [platform, 'unprocessed'],
          summarizedAt: new Date().toISOString(),
          summarizationFailed: true,
        };
      }

      // Handle error field in structured output
      if (parsed && parsed.error) {
        this.logInfo('LLM returned error in structured output', { platform, error: parsed.error });
        await sendTelegramMessage(chatId, "⚠️ Sorry, couldn't process the link. " + parsed.error);
        return {
          ...message,
          summary: parsed.error,
          tags: [platform, 'unprocessed'],
          summarizedAt: new Date().toISOString(),
          summarizationFailed: true,
        };
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
      // Return a fallback response with detailed error info
      return {
        ...message,
        summary: `Unable to generate summary for ${message.platform} content at this time. Reason: ${error.message}`,
        tags: [message.platform, 'unprocessed'],
        summarizedAt: new Date().toISOString(),
      };
    }
  }

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
          // Get structured summary from LLM
          const result = await this.llm.invoke(
            await this.structuredPrompt.format({
              content: content,
            }),
          );

          let parsed;
          try {
            let content = result.content.trim();
            // Remove Markdown code block if present
            if (content.startsWith('```')) {
              content = content
                .replace(/^```[a-zA-Z]*\n?/, '')
                .replace(/```$/, '')
                .trim();
            }
            // Remove any leading/trailing non-JSON content
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
              content = content.substring(firstBrace, lastBrace + 1);
            }
            // Handle double curly braces by replacing them with single braces
            content = content.replace(/{{/g, '{').replace(/}}/g, '}');
            parsed = JSON.parse(content);
          } catch (jsonError) {
            this.logInfo('Error parsing LLM response', {
              error: jsonError.message,
              response: result.content,
            });
            throw new Error('Failed to parse LLM response');
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          // Send success message back to user
          // (REMOVED: Only NotionProcessor should send the final Notion success message)

          return {
            ...message,
            summary: parsed.summary,
            tags: parsed.tags,
            resources,
          };
        } catch (error) {
          lastError = error;
          if (error.status === 429) {
            // Rate limit error
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
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
            throw error; // Re-throw non-rate-limit errors
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
}

module.exports = ContentSummarizer;
