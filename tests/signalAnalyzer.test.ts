import axios from "axios";
import { SignalAnalyzer } from "../src/services/signalAnalyzer";
import type { TelegramMessage } from "../src/types";

jest.mock("axios");

describe("SignalAnalyzer", () => {
  let analyzer: SignalAnalyzer;

  beforeEach(() => {
    analyzer = new SignalAnalyzer();
  });

  describe("analyzeMessage", () => {
    it("should analyze buy signal correctly", async () => {
      const message: TelegramMessage = {
        id: 1,
        text: "BTC/USDT BUY 45000",
        date: new Date(),
        chatId: 123456,
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      isSignal: true,
                      action: "buy",
                      symbol: "BTC/USDT",
                      price: 45000,
                      orderType: "limit",
                      confidence: 0.9,
                    },
                  ],
                  hasMultipleSignals: false,
                }),
              },
            },
          ],
        },
      });

      const result = await analyzer.analyzeMessage(message);

      expect(result.isSignal).toBe(true);
      expect(result.action).toBe("buy");
      expect(result.symbol).toBe("BTC/USDT");
      expect(result.price).toBe(45000);
      expect(result.confidence).toBe(0.9);
    });

    it("should analyze sell signal correctly", async () => {
      const message: TelegramMessage = {
        id: 2,
        text: "ETH/USDT SELL MARKET",
        date: new Date(),
        chatId: 987654,
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      isSignal: true,
                      action: "sell",
                      symbol: "ETH/USDT",
                      orderType: "market",
                      confidence: 0.8,
                    },
                  ],
                  hasMultipleSignals: false,
                }),
              },
            },
          ],
        },
      });

      const result = await analyzer.analyzeMessage(message);

      expect(result.isSignal).toBe(true);
      expect(result.action).toBe("sell");
      expect(result.symbol).toBe("ETH/USDT");
      expect(result.orderType).toBe("market");
      expect(result.confidence).toBe(0.8);
    });

    it("should handle non-signal messages", async () => {
      const message: TelegramMessage = {
        id: 3,
        text: "Hello, how are you?",
        date: new Date(),
        chatId: 123456,
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [],
                  hasMultipleSignals: false,
                }),
              },
            },
          ],
        },
      });

      const result = await analyzer.analyzeMessage(message);

      expect(result.isSignal).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe("analyzeMessageForMultipleSignals", () => {
    it("should analyze single signal correctly", async () => {
      const message: TelegramMessage = {
        id: 1,
        text: "BTC/USDT BUY 45000",
        date: new Date(),
        chatId: 123456,
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      isSignal: true,
                      action: "buy",
                      symbol: "BTC/USDT",
                      price: 45000,
                      orderType: "limit",
                      confidence: 0.9,
                    },
                  ],
                  hasMultipleSignals: false,
                }),
              },
            },
          ],
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signals).toHaveLength(1);
      expect(result.hasMultipleSignals).toBe(false);
      expect(result.signals[0].isSignal).toBe(true);
      expect(result.signals[0].action).toBe("buy");
      expect(result.signals[0].symbol).toBe("BTC/USDT");
    });

    it("should analyze multiple signals correctly", async () => {
      const message: TelegramMessage = {
        id: 2,
        text: "BTC/USDT BUY 45000, ETH/USDT SELL 3000",
        date: new Date(),
        chatId: 123456,
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      isSignal: true,
                      action: "buy",
                      symbol: "BTC/USDT",
                      price: 45000,
                      orderType: "limit",
                      confidence: 0.9,
                    },
                    {
                      isSignal: true,
                      action: "sell",
                      symbol: "ETH/USDT",
                      price: 3000,
                      orderType: "limit",
                      confidence: 0.8,
                    },
                  ],
                  hasMultipleSignals: true,
                }),
              },
            },
          ],
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signals).toHaveLength(2);
      expect(result.hasMultipleSignals).toBe(true);
      expect(result.signals[0].action).toBe("buy");
      expect(result.signals[0].symbol).toBe("BTC/USDT");
      expect(result.signals[1].action).toBe("sell");
      expect(result.signals[1].symbol).toBe("ETH/USDT");
    });

    it("should handle multiple signals for same symbol", async () => {
      const message: TelegramMessage = {
        id: 3,
        text: "BTC/USDT BUY 45000, BTC/USDT SELL 47000",
        date: new Date(),
        chatId: 123456,
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      isSignal: true,
                      action: "buy",
                      symbol: "BTC/USDT",
                      price: 45000,
                      orderType: "limit",
                      confidence: 0.9,
                    },
                    {
                      isSignal: true,
                      action: "sell",
                      symbol: "BTC/USDT",
                      price: 47000,
                      orderType: "limit",
                      confidence: 0.8,
                    },
                  ],
                  hasMultipleSignals: true,
                }),
              },
            },
          ],
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signals).toHaveLength(2);
      expect(result.hasMultipleSignals).toBe(true);
      expect(result.signals[0].symbol).toBe("BTC/USDT");
      expect(result.signals[1].symbol).toBe("BTC/USDT");
      expect(result.signals[0].action).toBe("buy");
      expect(result.signals[1].action).toBe("sell");
    });

    it("should handle non-signal messages", async () => {
      const message: TelegramMessage = {
        id: 4,
        text: "Hello, how are you?",
        date: new Date(),
        chatId: 123456,
      };

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [],
                  hasMultipleSignals: false,
                }),
              },
            },
          ],
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signals).toHaveLength(0);
      expect(result.hasMultipleSignals).toBe(false);
    });
  });

  describe("buildPrompt", () => {
    it("should build prompt correctly", () => {
      const message: TelegramMessage = {
        id: 1,
        text: "BTC/USDT BUY 45000",
        date: new Date(),
        chatId: 123456,
      };

      const prompt = (
        analyzer as unknown as {
          buildPrompt: (message: TelegramMessage) => string;
        }
      ).buildPrompt(message);

      expect(prompt).toContain("BTC/USDT BUY 45000");
      expect(prompt).toContain("trading signal");
    });
  });

  describe("buildPromptForMultipleSignals", () => {
    it("should build prompt for multiple signals correctly", () => {
      const message: TelegramMessage = {
        id: 1,
        text: "BTC/USDT BUY 45000, ETH/USDT SELL 3000",
        date: new Date(),
        chatId: 123456,
      };

      const prompt = (
        analyzer as unknown as {
          buildPromptForMultipleSignals: (message: TelegramMessage) => string;
        }
      ).buildPromptForMultipleSignals(message);

      expect(prompt).toContain("BTC/USDT BUY 45000, ETH/USDT SELL 3000");
      expect(prompt).toContain("extract ALL trading signals");
      expect(prompt).toContain("multiple signals");
    });
  });
});
