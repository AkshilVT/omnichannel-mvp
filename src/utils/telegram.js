const { Telegraf } = require('telegraf');

const token = process.env.TELEGRAM_BOT_TOKEN;

let bot;
if (token) {
  bot = new Telegraf(token);
}

async function sendTelegramMessage(chatId, message) {
  if (!bot) return;
  if (!chatId) {
    console.error('sendTelegramMessage: chatId is required');
    return;
  }
  try {
    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Failed to send Telegram message:', err.message);
  }
}

module.exports = { sendTelegramMessage, bot };
