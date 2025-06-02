const { google } = require('googleapis');
const BaseProcessor = require('./base-processor');
const RedisCacheProcessor = require('./redis-cache');
const MonitoringProcessor = require('./monitoring-processor');
const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Processes YouTube videos, fetching metadata and transcripts
 */
class YouTubeProcessor extends BaseProcessor {
  /**
   * Create a new YouTubeProcessor
   * @param {string} apiKey - YouTube API key
   * @param {RedisCacheProcessor} redisCacheProcessor - Optional Redis cache processor
   * @param {MonitoringProcessor} monitoringProcessor - Optional monitoring processor
   * @throws {Error} If API key is not provided
   */
  constructor(apiKey, redisCacheProcessor, monitoringProcessor) {
    super();
    if (!apiKey) {
      throw new Error('YouTube API key is required');
    }
    this.youtube = google.youtube('v3');
    this.apiKey = apiKey;
    this.cache =
      redisCacheProcessor || new RedisCacheProcessor(process.env.REDIS_URL, 'yt_video_', 3600);
    this.monitor = monitoringProcessor || new MonitoringProcessor();
  }

  /**
   * Process a message containing a YouTube URL
   * @param {Object} message - The message to process
   * @returns {Promise<Object>} The processed message with video data
   */
  async processMessage(message) {
    try {
      return await this.process(message);
    } catch (error) {
      await this.handleError(error, { message });
      throw error;
    }
  }

  /**
   * Process a YouTube URL and return video metadata
   * @param {Object|string} message - YouTube URL or message object containing URL
   * @returns {Promise<Object>} Processed video data
   */
  async process(message) {
    try {
      // Accept both string and object for backward compatibility
      const url = typeof message === 'string' ? message : message.url;
      this.logInfo('Processing YouTube content', { url });

      const videoId = this.extractVideoId(url);
      this.logInfo('Extracted video ID', { videoId });

      const metadata = await this.fetchVideoMetadata(videoId);
      this.logInfo('Successfully fetched video metadata', { videoId });

      let transcript = await this.fetchTranscript(videoId);
      if (!transcript) {
        transcript = [metadata.title, metadata.description].filter(Boolean).join('\n');
      }
      this.logInfo('Fetched transcript or fallback content', {
        videoId,
        transcriptPreview: transcript.slice(0, 200),
      });

      return {
        ...message,
        platform: 'youtube',
        type: 'video',
        title: metadata.title,
        url: metadata.url,
        content: transcript,
        data: metadata,
        quota: this.monitor.getStats(),
      };
    } catch (error) {
      await this.handleError(error, { message });
      throw error;
    }
  }

  /**
   * Extract video ID from various YouTube URL formats
   * @param {string} url - YouTube URL
   * @returns {string} Video ID
   * @throws {Error} If URL is invalid or video ID cannot be extracted
   */
  extractVideoId(url) {
    if (typeof url !== 'string') {
      throw new Error('extractVideoId expects a string URL');
    }
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    throw new Error('Invalid YouTube URL format');
  }

  /**
   * Fetch video metadata from YouTube API
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Video metadata
   * @throws {Error} If video not found or API request fails
   */
  async fetchVideoMetadata(videoId) {
    // Try Redis cache first
    const cached = await this.cache.get(videoId);
    if (cached) {
      this.logInfo('Retrieved video metadata from cache', { videoId });
      return cached;
    }

    // Check rate limit and quota
    this.monitor.checkRateLimit();
    this.monitor.checkQuota();

    try {
      const response = await this.youtube.videos.list({
        key: this.apiKey,
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId],
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      const metadata = {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle,
        thumbnails: video.snippet.thumbnails,
        duration: video.contentDetails.duration,
        statistics: video.statistics,
        url: `https://www.youtube.com/watch?v=${video.id}`,
      };

      await this.cache.set(videoId, metadata);
      this.logInfo('Cached video metadata', { videoId });
      return metadata;
    } catch (error) {
      this.logError('Error fetching video metadata', { error: error.message, videoId });
      throw error;
    }
  }

  /**
   * Fetch video transcript using youtube-transcript
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<string|null>} Video transcript or null if not available
   */
  async fetchTranscript(videoId) {
    try {
      const transcriptArr = await YoutubeTranscript.fetchTranscript(videoId);
      if (Array.isArray(transcriptArr) && transcriptArr.length > 0) {
        // Join all transcript text segments
        return transcriptArr.map((seg) => seg.text).join(' ');
      }
      return null;
    } catch (err) {
      this.logWarning('Transcript not available or failed to fetch', {
        videoId,
        error: err.message,
      });
      return null;
    }
  }
}

module.exports = YouTubeProcessor;
