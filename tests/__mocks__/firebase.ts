export const FirebaseService = jest.fn().mockImplementation(() => ({
  getTradingConfig: jest.fn().mockResolvedValue({
    isEnabled: true,
    maxPositionSize: 100,
    riskPercentage: 2,
  }),
  setTradingConfig: jest.fn().mockResolvedValue(undefined),
  updateTradingConfig: jest.fn().mockResolvedValue(undefined),
  enableTrading: jest.fn().mockResolvedValue(undefined),
  disableTrading: jest.fn().mockResolvedValue(undefined),
  setMaxPositionSize: jest.fn().mockResolvedValue(undefined),
  setRiskPercentage: jest.fn().mockResolvedValue(undefined),
}));

export interface TradingConfig {
  isEnabled: boolean;
  maxPositionSize: number;
  riskPercentage: number;
}
