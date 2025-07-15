export interface TelegramMessage {
  id: number;
  text?: string;
  photo?: string;
  date: Date;
  chatId: number;
}

export interface TradingSignal {
  isSignal: boolean;
  action?: "buy" | "sell" | "close";
  symbol?: string;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
  orderType: "market" | "limit";
  leverage?: number;
  sourceChatId: number;
  confidence: number;
  rawMessage: string;
}

export interface MultipleTradingSignals {
  signals: TradingSignal[];
  sourceChatId: number;
  rawMessage: string;
  hasMultipleSignals: boolean;
}

export interface OrderRequest {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_market";
  amount: number;
  price?: number;
  stopPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  positionSide?: "long" | "short";
}

export interface ExchangeConfig {
  primary: ExchangeAccount;
  secondary: ExchangeAccount;
}

export interface ExchangeAccount {
  id: string;
  name: string;
  apiKey: string;
  secret: string;
  allowedChatIds: number[];
}

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  phone: string;
}
