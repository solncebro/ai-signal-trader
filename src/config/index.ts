import dotenv from "dotenv";
import { TelegramConfig, ExchangeConfig, ExchangeAccount } from "../types";

dotenv.config();

export const telegramConfig: TelegramConfig = {
  apiId: parseInt(process.env.TELEGRAM_API_ID || "0"),
  apiHash: process.env.TELEGRAM_API_HASH || "",
  phone: process.env.TELEGRAM_PHONE || "",
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

if (!telegramConfig.apiId || !telegramConfig.apiHash || !telegramConfig.phone) {
  throw new Error("Missing required Telegram configuration");
}

if (!exchangeConfig.primary.apiKey || !exchangeConfig.primary.secret) {
  throw new Error("Missing required Exchange configuration");
}

if (!openaiApiKey) {
  throw new Error("Missing OpenAI API key");
}
