import { ExchangeConfig, TelegramConfig } from "../../src/types";

export const telegramConfig: TelegramConfig = {
  apiId: 123456,
  apiHash: "test_api_hash",
  phone: "+1234567890",
  appSession: "test_app_session",
};

export const exchangeConfig: ExchangeConfig = {
  primary: {
    id: "primary",
    name: "Primary Account",
    apiKey: "test-primary-api-key",
    secret: "test-primary-secret",
    allowedChatIdList: [123456],
  },
  secondary: {
    id: "secondary",
    name: "Secondary Account",
    apiKey: "test-secondary-api-key",
    secret: "test-secondary-secret",
    allowedChatIdList: [987654],
  },
};

export const openaiApiKey = "test_openai_key";
