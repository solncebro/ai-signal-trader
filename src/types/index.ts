/// <reference path='../../utils.d.ts' />

export interface TelegramMessage {
  id: number;
  text?: string;
  photo?: string;
  date: Date;
  chatId: number;
}

export interface TradingSignal {
  isSignal: boolean;
  action?: Nullable<"buy" | "sell" | "close">;
  symbol?: Nullable<string>;
  price?: Nullable<number>;
  stopLoss?: Nullable<number>;
  takeProfit?: Nullable<number>;
  quantity?: Nullable<number>;
  orderType: "market" | "limit";
  leverage?: Nullable<number>;
  sourceChatId: number;
  confidence: number;
  rawMessage: string;
  reasoning?: Nullable<string>;
}

export interface MultipleTradingSignals {
  signalList: TradingSignal[];
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
  allowedChatIdList: number[];
}

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  phone: string;
  appSession: string;
}
