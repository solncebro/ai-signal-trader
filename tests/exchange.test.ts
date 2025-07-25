import { ExchangeService } from "../src/services/exchange";
import { TradingSignal } from "../src/types";
import { exchangeConfig } from "../src/config";

jest.mock("ccxt");
jest.mock("../src/config", () => ({
  exchangeConfig: {
    name: "binance",
    apiKey: "test_primary_key",
    secret: "test_primary_secret",
    sandbox: true,
  },
  openaiApiKey: "test_openai_key",
}));
jest.mock("../src/services/firebase", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
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
    startRealtimeUpdates: jest.fn(),
    stopRealtimeUpdates: jest.fn(),
  })),
  TradingConfig: jest.fn(),
}));
jest.mock("../src/services/logger");
jest.mock("../src/services/notificationService", () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendErrorNotification: jest.fn().mockResolvedValue(undefined),
    sendSignalResult: jest.fn().mockResolvedValue(undefined),
    sendLogMessage: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockFirebaseService = {
  getTradingConfig: jest.fn(),
  startRealtimeUpdates: jest.fn(),
  stopRealtimeUpdates: jest.fn(),
  updateTradingConfig: jest.fn(),
};

describe("ExchangeService", () => {
  let exchangeService: ExchangeService;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockNotificationService =
      new (require("../src/services/notificationService").NotificationService)();
    exchangeService = new ExchangeService(
      "test_user_id",
      mockNotificationService
    );
  });

  describe("getExchangeAccountServiceByChatId", () => {
    it("should return primary exchange for primary chat ID", () => {
      const signal = {
        action: "buy",
        symbol: "BTC/USDT",
        orderType: "limit" as const,
        price: 45000,
        confidence: 0.8,
      };

      const orderRequest = (exchangeService as any).buildOrderRequest(signal);

      expect(orderRequest.symbol).toBe("BTC/USDT");
      expect(orderRequest.side).toBe("buy");
      expect(orderRequest.type).toBe("limit");
      expect(orderRequest.price).toBe(45000);
      expect(orderRequest.positionSide).toBe("long");
    });

    it("should return secondary exchange for secondary chat ID", () => {
      const signal = {
        action: "sell",
        symbol: "ETH/USDT",
        orderType: "market" as const,
        confidence: 0.8,
      };

      const orderRequest = (exchangeService as any).buildOrderRequest(signal);

      expect(orderRequest.symbol).toBe("ETH/USDT");
      expect(orderRequest.side).toBe("sell");
      expect(orderRequest.type).toBe("market");
      expect(orderRequest.positionSide).toBe("short");
    });
  });

  describe("buildOrderRequest", () => {
    it("should build buy order request with long position", () => {
      const signal: TradingSignal = {
        action: "buy",
        symbol: "BTC/USDT",
        price: 45000,
        orderType: "limit",
        confidence: 0.9,
      };

      const orderRequest = (exchangeService as any).buildOrderRequest(signal);

      expect(orderRequest.symbol).toBe("BTC/USDT");
      expect(orderRequest.side).toBe("buy");
      expect(orderRequest.type).toBe("limit");
      expect(orderRequest.price).toBe(45000);
      expect(orderRequest.positionSide).toBe("long");
    });

    it("should build sell order request with short position", () => {
      const signal: TradingSignal = {
        action: "sell",
        symbol: "ETH/USDT",
        orderType: "market",
        confidence: 0.8,
      };

      const orderRequest = (exchangeService as any).buildOrderRequest(signal);

      expect(orderRequest.symbol).toBe("ETH/USDT");
      expect(orderRequest.side).toBe("sell");
      expect(orderRequest.type).toBe("market");
      expect(orderRequest.positionSide).toBe("short");
    });

    it("should use quantity from signal if provided", () => {
      const signal: TradingSignal = {
        action: "buy",
        symbol: "BTC/USDT",
        price: 45000,
        quantity: 0.1,
        orderType: "limit",
        confidence: 0.9,
      };

      const orderRequest = (exchangeService as any).buildOrderRequest(signal);

      expect(orderRequest.amount).toBe(0.1);
    });
  });

  describe("determinePositionSide", () => {
    it("should return long for buy action", () => {
      const positionSide = (exchangeService as any).determinePositionSide(
        "buy"
      );

      expect(positionSide).toBe("long");
    });

    it("should return short for sell action", () => {
      const positionSide = (exchangeService as any).determinePositionSide(
        "sell"
      );

      expect(positionSide).toBe("short");
    });

    it("should return long as default", () => {
      const positionSide = (exchangeService as any).determinePositionSide(
        "close"
      );

      expect(positionSide).toBe("long");
    });
  });

  describe("calculatePositionSize", () => {
    it("should use quantity from signal if provided", () => {
      const signal: TradingSignal = {
        action: "buy",
        symbol: "BTC/USDT",
        quantity: 0.5,
        orderType: "market",
        confidence: 0.9,
      };

      const size = (exchangeService as any).calculatePositionSize(signal);

      expect(size).toBe(0.5);
    });

    it("should calculate size based on price if no quantity provided", () => {
      const signal: TradingSignal = {
        action: "buy",
        symbol: "BTC/USDT",
        price: 45000,
        orderType: "limit",
        confidence: 0.9,
      };

      const size = (exchangeService as any).calculatePositionSize(signal);

      expect(size).toBeGreaterThan(0);
    });
  });
});
