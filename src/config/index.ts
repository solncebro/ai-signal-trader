import dotenv from "dotenv";
import { TelegramConfig, ExchangeConfig } from "../types";

dotenv.config();

export const telegramConfig: TelegramConfig = {
  apiId: parseInt(process.env.TELEGRAM_API_ID || "0"),
  apiHash: process.env.TELEGRAM_API_HASH || "",
  phone: process.env.TELEGRAM_PHONE || "",
  appSession: process.env.TELEGRAM_APP_SESSION || "",
};

export const exchangeConfig: ExchangeConfig = {
  primary: {
    id: "primary",
    name: "Primary Account",
    apiKey: process.env.EXCHANGE_API_KEY_PRIMARY || "",
    secret: process.env.EXCHANGE_SECRET_PRIMARY || "",
    allowedChatIds:
      process.env.PRIMARY_ACCOUNT_CHAT_IDS?.split(",").map((id) =>
        parseInt(id.trim())
      ) || [],
  },
  secondary: {
    id: "secondary",
    name: "Secondary Account",
    apiKey: process.env.EXCHANGE_API_KEY_SECONDARY || "",
    secret: process.env.EXCHANGE_SECRET_SECONDARY || "",
    allowedChatIds:
      process.env.SECONDARY_ACCOUNT_CHAT_IDS?.split(",").map((id) =>
        parseInt(id.trim())
      ) || [],
  },
};

export const openaiApiKey = process.env.OPENAI_API_KEY || "";

export const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  privateKey: process.env.FIREBASE_PRIVATE_KEY || "",
};

export const telegramBotConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  chatId: process.env.TELEGRAM_BOT_CHAT_ID || "",
};

export function validateEnv() {
  if (
    !telegramConfig.apiId ||
    !telegramConfig.apiHash ||
    !telegramConfig.phone
  ) {
    throw new Error("Missing required Telegram configuration");
  }
  if (!telegramConfig.appSession) {
    throw new Error("Missing TELEGRAM_APP_SESSION in .env");
  }
  if (!exchangeConfig.primary.apiKey || !exchangeConfig.primary.secret) {
    throw new Error("Missing required Exchange configuration (primary)");
  }
  if (!exchangeConfig.secondary.apiKey || !exchangeConfig.secondary.secret) {
    throw new Error("Missing required Exchange configuration (secondary)");
  }
  if (!openaiApiKey) {
    throw new Error("Missing OpenAI API key");
  }
  if (
    !firebaseConfig.projectId ||
    !firebaseConfig.clientEmail ||
    !firebaseConfig.privateKey
  ) {
    throw new Error("Missing Firebase configuration");
  }
  if (!telegramBotConfig.botToken || !telegramBotConfig.chatId) {
    throw new Error("Missing Telegram Bot configuration");
  }
  if (
    exchangeConfig.primary.allowedChatIds.length === 0 &&
    exchangeConfig.secondary.allowedChatIds.length === 0
  ) {
    throw new Error("No chat IDs configured for any exchange account");
  }
}

validateEnv();
