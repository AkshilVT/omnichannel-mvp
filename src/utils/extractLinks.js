const PLATFORM_LINKS = {
  'hugging face': 'https://huggingface.co',
  'google cloud': 'https://cloud.google.com',
  cohere: 'https://cohere.com',
  assemblyai: 'https://www.assemblyai.com',
  'eden ai': 'https://www.edenai.co',
  openai: 'https://openai.com',
  github: 'https://github.com',
  notion: 'https://www.notion.so',
  // Add more as needed
};

function extractLinks(text) {
  if (!text || typeof text !== 'string') return [];
  const urlRegex = /https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/g;
  const foundUrls = text.match(urlRegex) || [];

  // Detect platform names (case-insensitive)
  const lowerText = text.toLowerCase();
  const platformUrls = Object.entries(PLATFORM_LINKS)
    .filter(([name]) => lowerText.includes(name))
    .map(([, url]) => url);

  // Deduplicate
  const allUrls = Array.from(new Set([...foundUrls, ...platformUrls]));
  return allUrls;
}

module.exports = extractLinks;
