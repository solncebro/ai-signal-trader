export interface ExchangeConfig {
  primary: ExchangeAccount;
  secondary: ExchangeAccount;
}

export interface ExchangeAccount {
  id: string;
  name: string;
  apiKey: string;
  secret: string;
  allowedChatIdList: number[];
}

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  phone: string;
  appSession: string;
}
