import { TradingSignal } from "../types";

export const isSignalValid = (signal: TradingSignal): boolean => {
  return signal.confidence >= 0.7;
};
