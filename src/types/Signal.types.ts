import { Nullable } from "../../utils.d";

export interface TradingSignal {
  action?: Nullable<"buy" | "sell" | "close">;
  symbol?: Nullable<string>;
  price?: Nullable<number>;
  stopLoss?: Nullable<number>;
  takeProfit?: Nullable<number>;
  quantity?: Nullable<number>;
  orderType: "market" | "limit";
  leverage?: Nullable<number>;
  confidence: number;
  reasoning?: Nullable<string>;
}

export interface MultipleTradingSignals {
  signalList: TradingSignal[];
  sourceChatId: number;
  rawMessage: string;
}

export interface SendSignalResultArgs {
  signal: TradingSignal;
  isSuccess: boolean;
  sourceChatId: number;
  rawMessage: string;
  details?: string;
}

export interface LlmTradingSignalsResponse {
  signalList?: TradingSignal[];
}
