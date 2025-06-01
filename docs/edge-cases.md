# Omnichannel Bot: Edge Cases & Troubleshooting

This document lists known edge cases, workarounds, and unsolved issues encountered during the
development and operation of the Omnichannel Bot.

---

## 1. Cloudflare Security Challenge (Dynamic Content Protection)

**Description:**

- When scraping certain sites (e.g., OpenAI docs), the bot receives a Cloudflare security challenge
  page instead of the actual content.
- This page is designed to verify that the request is from a legitimate browser (JavaScript and
  cookies required).

**Workarounds:**

- Use Playwright (already implemented) to simulate a real browser. However, some sites may require
  additional steps:
  - Enable JavaScript and cookies in Playwright (default is enabled).
  - Add custom headers or user-agent strings to mimic real browsers.
  - Implement waiting for navigation or challenge resolution.
- For sites with persistent challenges, manual intervention or authenticated sessions may be
  required.

**Status:**

- Partially solved. Some sites still block automated browsers. No universal solution for all
  Cloudflare-protected sites.

---

## 2. Missing or Placeholder Content from Social Platforms

**Description:**

- For platforms like LinkedIn, Instagram, and Twitter, the scraper may return placeholder text
  (e.g., "Post content will be extracted here") instead of actual post content.
- This is due to API restrictions, login requirements, or anti-bot measures.

**Workarounds:**

- Use official APIs where possible (requires API keys and compliance with platform terms).
- For public content, Playwright can sometimes extract visible text, but may require login
  automation.
- For LinkedIn, consider using third-party scraping services or APIs (with caution and legal
  review).

**Status:**

- Not fully solved. Extraction of real post content from these platforms is limited by technical and
  legal constraints.

---

## 3. LLM Response Format Variability

**Description:**

- The LLM (Gemini via LangChain) may return tags as a string, array, or object, causing errors if
  not handled generically.

**Workarounds:**

- Added robust type checking in the tag extraction logic to handle all response formats.

**Status:**

- Solved.

---

## 4. Playwright Browser Not Installed

**Description:**

- Playwright scraping fails with an error if the required browser binaries are not installed.

**Workarounds:**

- Run `npx playwright install` after installing Playwright to download the necessary browsers.

**Status:**

- Solved.

---

## 5. Notion API: Page/Database Not Found

**Description:**

- Notion integration fails if the provided page or database ID is incorrect or not shared with the
  integration.

**Workarounds:**

- Double-check the Notion root page/database ID.
- Ensure the integration is added to the page/database in Notion.
- Follow [Notion API documentation](https://developers.notion.com/docs/working-with-page-content)
  for correct setup.

**Status:**

- Solved (with correct setup).

---

## 6. Rate Limits and Quotas (Gemini, Notion, Telegram)

**Description:**

- Exceeding API rate limits or quotas can cause failures in summarization, Notion integration, or
  Telegram notifications.

**Workarounds:**

- Monitor API usage and handle errors gracefully.
- Implement retry logic or exponential backoff if needed.
- Upgrade to higher quota plans if required.

**Status:**

- Partially solved. Manual monitoring may still be needed.

---

## 7. Unsolved/Outstanding Issues

- **Instagram/Twitter/LinkedIn full content extraction:** Not fully solved due to anti-bot and login
  requirements.
- **Cloudflare/Advanced Bot Protection:** Some sites remain inaccessible even with Playwright.
- **Dynamic JavaScript-heavy sites:** May require custom Playwright scripts for interaction.
- **Legal/Ethical Scraping:** Always review terms of service and legal implications before scraping
  any platform.

---

**To contribute new edge cases or solutions, please update this file or open an issue in the
repository.**
