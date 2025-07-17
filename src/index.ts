import { ExchangeService } from "./services/exchange";
import { NotificationService } from "./services/notificationService";
import { SignalAnalyzer } from "./services/signalAnalyzer";
import { TelegramService } from "./services/telegram";
import { TelegramMessage, TradingSignal, SendSignalResultArgs } from "./types";
import pinoLogger from "./services/logger";

class SignalTrader {
  private telegramService: TelegramService;
  private signalAnalyzer: SignalAnalyzer;
  private exchangeService: ExchangeService;
  private notificationService: NotificationService;
  private isRunning: boolean = false;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.notificationService = new NotificationService();
    this.telegramService = new TelegramService(this.notificationService);
    this.signalAnalyzer = new SignalAnalyzer(this.notificationService);
    this.exchangeService = new ExchangeService(
      userId,
      this.notificationService
    );
  }

  async start(): Promise<void> {
    try {
      pinoLogger.info("Starting Signal Trader...");

      await this.telegramService.connect();
      await this.exchangeService.initialize();

      this.isRunning = true;

      await this.notificationService.sendStartupNotification();

      await this.telegramService.listenForNewMessages(
        this.handleNewMessage.bind(this)
      );

      pinoLogger.info("Signal Trader is running. Press Ctrl+C to stop.");

      process.on("SIGINT", this.stop.bind(this));
      process.on("SIGTERM", this.stop.bind(this));
    } catch (error) {
      pinoLogger.error("Failed to start Signal Trader:", error);
      await this.notificationService.sendErrorNotification(
        String(error),
        "Startup"
      );
      await this.stop();
    }
  }

  private async handleNewMessage(message: TelegramMessage): Promise<void> {
    try {
      pinoLogger.info(
        `Received message from chat ${message.chatId}: ${message.text}`
      );

      const multipleSignals =
        await this.signalAnalyzer.analyzeMessageForMultipleSignals(message);

      if (multipleSignals.signalList.length === 0) {
        pinoLogger.info("Message is not a valid trading signal");

        return;
      }

      pinoLogger.info(
        `Found ${multipleSignals.signalList.length} signal(s) in message`
      );

      for (let i = 0; i < multipleSignals.signalList.length; i++) {
        const signal = multipleSignals.signalList[i];

        if (signal.isSignal && signal.confidence > 0.7) {
          pinoLogger.info(
            `Valid signal ${i + 1}/${multipleSignals.signalList.length}: ${
              signal.action
            } ${signal.symbol}`
          );

          await this.executeSignal(
            signal,
            multipleSignals.sourceChatId,
            multipleSignals.rawMessage
          );
        } else {
          pinoLogger.info(
            `Signal ${i + 1}/${
              multipleSignals.signalList.length
            } is not valid or has low confidence`
          );
        }
      }
    } catch (error) {
      pinoLogger.error("Failed to handle new message:", error);

      await this.notificationService.sendErrorNotification(
        String(error),
        "Message Processing"
      );
    }
  }

  private async executeSignal(
    signal: TradingSignal,
    sourceChatId: number,
    rawMessage: string
  ): Promise<void> {
    const defaultSignalResult: SendSignalResultArgs = {
      signal,
      sourceChatId,
      rawMessage,
      isSuccess: false,
    };

    try {
      pinoLogger.info(
        `Executing signal: ${signal.action} ${signal.symbol} at ${signal.price}`
      );
      const isSuccess = await this.exchangeService.executeSignal(
        signal,
        sourceChatId
      );

      const signalResultArgs = {
        ...defaultSignalResult,
        isSuccess,
      };

      if (isSuccess) {
        pinoLogger.info(
          `Successfully executed signal: ${signal.action} ${signal.symbol}`
        );

        await this.notificationService.sendSignalResult(signalResultArgs);
      } else {
        pinoLogger.info(
          `Signal execution failed: ${signal.action} ${signal.symbol}`
        );

        await this.notificationService.sendSignalResult({
          ...signalResultArgs,
          details: "Order execution failed",
        });
      }
    } catch (error) {
      pinoLogger.error("Error executing signal:", error);

      await this.notificationService.sendSignalResult({
        ...defaultSignalResult,
        details: String(error),
      });
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    pinoLogger.info("Stopping Signal Trader...");
    this.isRunning = false;

    try {
      await this.exchangeService.shutdown();
      await this.telegramService.disconnect();
      await this.notificationService.sendShutdownNotification();

      pinoLogger.info("Signal Trader stopped successfully");
    } catch (error) {
      pinoLogger.error("Error stopping Signal Trader:", error);
    }

    process.exit(0);
  }
}

async function main() {
  const userId = process.env.USER_ID;

  if (!userId) {
    pinoLogger.error(
      `USER_ID is not set. Please specify USER_ID in your environment variables.`
    );

    process.exit(1);
  }

  const trader = new SignalTrader(userId);

  await trader.start();
}

main().catch((error) => {
  pinoLogger.error("Application failed to start:", error);
  process.exit(1);
});
