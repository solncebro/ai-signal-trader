import axios from "axios";
import { SignalAnalyzer } from "../src/services/signalAnalyzer";
import type { TelegramMessage } from "../src/types";

jest.mock("axios");
jest.mock("../src/config", () => ({
  openaiApiKey: "test-api-key",
}));

describe("SignalAnalyzer", () => {
  let analyzer: SignalAnalyzer;

  beforeEach(() => {
    analyzer = new SignalAnalyzer();
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

      expect(result.signalList).toHaveLength(1);
      expect(result.hasMultipleSignals).toBe(false);
      expect(result.signalList[0].isSignal).toBe(true);
      expect(result.signalList[0].action).toBe("buy");
      expect(result.signalList[0].symbol).toBe("BTC/USDT");
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

      expect(result.signalList).toHaveLength(2);
      expect(result.hasMultipleSignals).toBe(true);
      expect(result.signalList[0].action).toBe("buy");
      expect(result.signalList[0].symbol).toBe("BTC/USDT");
      expect(result.signalList[1].action).toBe("sell");
      expect(result.signalList[1].symbol).toBe("ETH/USDT");
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

      expect(result.signalList).toHaveLength(2);
      expect(result.hasMultipleSignals).toBe(true);
      expect(result.signalList[0].symbol).toBe("BTC/USDT");
      expect(result.signalList[1].symbol).toBe("BTC/USDT");
      expect(result.signalList[0].action).toBe("buy");
      expect(result.signalList[1].action).toBe("sell");
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

      expect(result.signalList).toHaveLength(0);
      expect(result.hasMultipleSignals).toBe(false);
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

    it("should include photo in prompt when available", () => {
      const message: TelegramMessage = {
        id: 1,
        text: "BTC/USDT BUY 45000",
        date: new Date(),
        chatId: 123456,
        photo:
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      };

      const prompt = (
        analyzer as unknown as {
          buildPromptForMultipleSignals: (message: TelegramMessage) => string;
        }
      ).buildPromptForMultipleSignals(message);

      expect(prompt).toContain("Photo (base64):");
      expect(prompt).toContain(
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      );
    });
  });
});
