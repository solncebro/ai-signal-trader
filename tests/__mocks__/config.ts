import {
  TelegramConfig,
  ExchangeConfig,
  ExchangeAccount,
} from "../../src/types";

export const telegramConfig: TelegramConfig = {
  apiId: 123456,
  apiHash: "test_api_hash",
  phone: "+1234567890",
};

export const exchangeConfig: ExchangeConfig = {
  primary: {
    id: "primary",
    name: "Primary Account",
    apiKey: "primary_api_key",
    secret: "primary_secret",
    allowedChatIds: [123456],
  },
  secondary: {
    id: "secondary",
    name: "Secondary Account",
    apiKey: "secondary_api_key",
    secret: "secondary_secret",
    allowedChatIds: [987654],
  },
};

export const openaiApiKey = "test_openai_key";
