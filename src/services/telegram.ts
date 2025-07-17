import * as readline from "node:readline";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { telegramConfig, exchangeConfig } from "../config";
import type { TelegramMessage } from "../types";
import pinoLogger from "./logger";
import { NotificationService } from "./notificationService";

export class TelegramService {
  private client: TelegramClient;
  private session: StringSession;
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    this.session = new StringSession(telegramConfig.appSession);
    this.client = new TelegramClient(
      this.session,
      telegramConfig.apiId,
      telegramConfig.apiHash,
      {
        connectionRetries: 5,
      }
    );
  }

  async connect(): Promise<void> {
    try {
      pinoLogger.info("Attempting to connect to Telegram...");

      const isConnected = await this.client.connect();

      if (isConnected && (await this.client.isUserAuthorized())) {
        pinoLogger.info(
          "Connected to Telegram using TELEGRAM_APP_SESSION from .env"
        );

        return;
      }

      pinoLogger.info("No valid session found, starting authorization...");

      await this.client.start({
        phoneNumber: telegramConfig.phone,
        phoneCode: async () => {
          const code = await this.promptForCode();

          return code;
        },
        onError: (err) => {
          pinoLogger.error("Telegram connection error:", err);
        },
      });

      const sessionString = this.session.save();
      pinoLogger.info(`Telegram TELEGRAM_APP_SESSION: ${sessionString}`);

      await this.notificationService.sendLogMessage(
        `<b>TELEGRAM_APP_SESSION</b> (скопируйте в .env): <code>${sessionString}</code>`
      );

      pinoLogger.info(
        "Connected to Telegram and sent TELEGRAM_APP_SESSION to bot"
      );
    } catch (err) {
      pinoLogger.error("Failed to connect to Telegram:", err);

      if (err instanceof Error) {
        if (err.message.includes("API_ID_INVALID")) {
          throw new Error(
            "Invalid API ID - please check your Telegram API credentials"
          );
        }

        if (err.message.includes("API_HASH_INVALID")) {
          throw new Error(
            "Invalid API Hash - please check your Telegram API credentials"
          );
        }

        if (err.message.includes("PHONE_NUMBER_INVALID")) {
          throw new Error(
            "Invalid phone number - please check the phone number format"
          );
        }
      }

      throw err;
    }
  }

  private async promptForCode(): Promise<string> {
    const readlineInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      readlineInterface.question(
        "Please enter the verification code sent to your phone: ",
        (code) => {
          readlineInterface.close();
          resolve(code.trim());
        }
      );
    });
  }

  private async downloadPhoto(photo: any): Promise<string> {
    try {
      const buffer = await this.client.downloadMedia(photo);

      return buffer ? buffer.toString("base64") : "";
    } catch (error) {
      pinoLogger.error("Failed to download photo:", error);

      return "";
    }
  }

  async listenForNewMessages(
    callback: (message: TelegramMessage) => void
  ): Promise<void> {
    const allAllowedChatIdList = [
      ...exchangeConfig.primary.allowedChatIdList,
      ...exchangeConfig.secondary.allowedChatIdList,
    ];

    if (allAllowedChatIdList.length === 0) {
      throw new Error("No chat IDs configured for any exchange account");
    }

    this.client.addEventHandler(async (event: any) => {
      if (
        event.message &&
        allAllowedChatIdList.includes(event.message.chatId)
      ) {
        const message: TelegramMessage = {
          id: event.message.id,
          text: event.message.text || "",
          photo: event.message.photo
            ? await this.downloadPhoto(event.message.photo)
            : undefined,
          date: new Date(event.message.date * 1000),
          chatId: event.message.chatId,
        };

        pinoLogger.info(`Received message from chat ${event.message.chatId}`);

        callback(message);
      }
    });

    pinoLogger.info(
      `Started listening for new messages in chats: ${allAllowedChatIdList.join(
        ", "
      )}`
    );
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();

    pinoLogger.info("Disconnected from Telegram");
  }
}
