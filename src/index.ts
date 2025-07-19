import { ExchangeService } from "./services/exchange";
import pinoLogger from "./services/logger";
import { NotificationService } from "./services/notificationService";
import { SignalAnalyzer } from "./services/signalAnalyzer";
import { TelegramService } from "./services/telegram";
import { SignalData, TelegramMessage } from "./types";
import { isSignalValid } from "./utils/other";

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

      const { signalList, sourceChatId, rawMessage } =
        await this.signalAnalyzer.analyzeMessageForMultipleSignals(message);

      if (signalList.length === 0) {
        pinoLogger.info("Message has no valid trading signal");

        return;
      }

      pinoLogger.info(`Found ${signalList.length} signals in message`);

      for (let i = 0; i < signalList.length; i++) {
        const signal = signalList[i];

        if (isSignalValid(signal)) {
          pinoLogger.info(
            `Valid signal ${i + 1}/${signalList.length}: ${signal.action} ${
              signal.symbol
            }`
          );

          const defaultSignalData: SignalData = {
            signal,
            sourceChatId,
            rawMessage,
            isSuccess: false,
          };

          await this.hadnleSignal(defaultSignalData);
        } else {
          pinoLogger.info(
            `Signal ${i + 1}/${signalList.length} has low confidence: ${
              signal.confidence
            }`
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

  private async hadnleSignal(signalData: SignalData): Promise<void> {
    const { signal, sourceChatId } = signalData;

    try {
      pinoLogger.info(
        `Executing signal: ${signal.action} ${signal.symbol} at ${signal.price}`
      );
      const isSuccess = await this.exchangeService.executeSignal(
        signal,
        sourceChatId
      );

      const signalResult = {
        ...signalData,
        isSuccess,
      };

      const message = isSuccess
        ? `Successfully executed signal: ${signal.action} ${signal.symbol}`
        : `Signal execution failed: ${signal.action} ${signal.symbol}`;

      const signalResultArgs = isSuccess
        ? signalResult
        : {
            ...signalResult,
            details: "Order execution failed",
          };

      pinoLogger.info(message);

      await this.notificationService.sendSignalResult(signalResultArgs);
    } catch (error) {
      pinoLogger.error("Error executing signal:", error);

      await this.notificationService.sendSignalResult({
        ...signalData,
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
