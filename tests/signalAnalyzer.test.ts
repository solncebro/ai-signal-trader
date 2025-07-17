import { SignalAnalyzer } from "../src/services/signalAnalyzer";
import type { TelegramMessage } from "../src/types";
import { NotificationService } from "../src/services/notificationService";

const mockCreate = jest.fn();
const mockNotificationService: Partial<NotificationService> = {
  sendLogMessage: jest.fn(),
};

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

jest.mock("../src/config", () => ({
  openaiApiKey: "test-api-key",
}));

describe("SignalAnalyzer", () => {
  let analyzer: SignalAnalyzer;

  beforeEach(() => {
    analyzer = new SignalAnalyzer(
      mockNotificationService as NotificationService
    );
    mockCreate.mockClear();
    (mockNotificationService.sendLogMessage as jest.Mock).mockClear();
  });

  describe("analyzeMessageForMultipleSignals", () => {
    it("should analyze single signal correctly", async () => {
      const message: TelegramMessage = {
        id: 1,
        text: "BTC/USDT BUY 45000",
        date: new Date(),
        chatId: 123456,
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                signalList: [
                  {
                    action: "buy",
                    symbol: "BTC/USDT",
                    price: 45000,
                    orderType: "limit",
                    confidence: 0.9,
                  },
                ],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230,
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signalList).toHaveLength(1);

      expect(result.signalList[0].action).toBe("buy");
      expect(result.signalList[0].symbol).toBe("BTC/USDT");

      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("🔍 Message analysis completed")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Input: 150 tokens")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Output: 80 tokens")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Total: 230 tokens")
      );
    });

    it("should analyze multiple signals correctly", async () => {
      const message: TelegramMessage = {
        id: 2,
        text: "BTC/USDT BUY 45000, ETH/USDT SELL 3000",
        date: new Date(),
        chatId: 123456,
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                signalList: [
                  {
                    action: "buy",
                    symbol: "BTC/USDT",
                    price: 45000,
                    orderType: "limit",
                    confidence: 0.9,
                  },
                  {
                    action: "sell",
                    symbol: "ETH/USDT",
                    price: 3000,
                    orderType: "limit",
                    confidence: 0.8,
                  },
                ],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230,
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signalList).toHaveLength(2);
      expect(result.signalList[0].action).toBe("buy");
      expect(result.signalList[0].symbol).toBe("BTC/USDT");
      expect(result.signalList[1].action).toBe("sell");
      expect(result.signalList[1].symbol).toBe("ETH/USDT");

      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("🔍 Message analysis completed")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Input: 150 tokens")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Output: 80 tokens")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Total: 230 tokens")
      );
    });

    it("should handle multiple signals for same symbol", async () => {
      const message: TelegramMessage = {
        id: 3,
        text: "BTC/USDT BUY 45000, BTC/USDT SELL 47000",
        date: new Date(),
        chatId: 123456,
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                signalList: [
                  {
                    action: "buy",
                    symbol: "BTC/USDT",
                    price: 45000,
                    orderType: "limit",
                    confidence: 0.9,
                  },
                  {
                    action: "sell",
                    symbol: "BTC/USDT",
                    price: 47000,
                    orderType: "limit",
                    confidence: 0.8,
                  },
                ],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230,
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signalList).toHaveLength(2);
      expect(result.signalList[0].symbol).toBe("BTC/USDT");
      expect(result.signalList[1].symbol).toBe("BTC/USDT");
      expect(result.signalList[0].action).toBe("buy");
      expect(result.signalList[1].action).toBe("sell");

      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("🔍 Message analysis completed")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Input: 150 tokens")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Output: 80 tokens")
      );
      expect(mockNotificationService.sendLogMessage).toHaveBeenCalledWith(
        expect.stringContaining("Total: 230 tokens")
      );
    });

    it("should handle non-signal messages", async () => {
      const message: TelegramMessage = {
        id: 4,
        text: "Hello, how are you?",
        date: new Date(),
        chatId: 123456,
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                signalList: [],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230,
        },
      });

      const result = await analyzer.analyzeMessageForMultipleSignals(message);

      expect(result.signalList).toHaveLength(0);
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
