import axios from "axios";
import { telegramBotConfig } from "../config";
import { SendSignalResultArgs } from "../types";
import { getCurrentDate } from "../utils/date";
import { truncateText } from "../utils/text";
import pinoLogger from "./logger";

export class NotificationService {
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = telegramBotConfig.botToken;
    this.chatId = telegramBotConfig.chatId;
  }

  async sendLogMessage(message: string): Promise<void> {
    if (!this.botToken || !this.chatId) {
      pinoLogger.info(
        "Bot token or chat ID not configured, skipping notification"
      );

      return;
    }

    try {
      await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
          parse_mode: "HTML",
        }
      );
    } catch (error) {
      pinoLogger.error("Failed to send notification:", error);
    }
  }

  async sendSignalResult(args: SendSignalResultArgs): Promise<void> {
    const date = getCurrentDate();

    let message = `<b>🔔 Signal Processing Result</b>\n\n`;
    message += `📅 <b>Time:</b> ${date}\n`;
    message += `📱 <b>Source:</b> Chat ${args.sourceChatId}\n`;
    message += `📊 <b>Signal:</b> ${args.signal.action?.toUpperCase()} ${
      args.signal.symbol
    }\n`;
    message += `💰 <b>Price:</b> ${args.signal.price ?? "N/A"}\n`;
    message += `🎯 <b>Confidence:</b> ${(args.signal.confidence * 100).toFixed(
      1
    )}%\n`;
    message += `📝 <b>Message:</b> ${truncateText(args.rawMessage, 100)}\n\n`;

    if (args.isSuccess) {
      message += `✅ <b>Status:</b> Successfully executed\n`;
    } else {
      message += `❌ <b>Status:</b> Failed to execute\n`;
    }

    if (args.details) {
      message += `📋 <b>Details:</b> ${args.details}\n`;
    }

    await this.sendLogMessage(message);
  }

  async sendErrorNotification(error: string, context?: string): Promise<void> {
    const date = getCurrentDate();

    let message = `<b>🚨 Error Notification</b>\n\n`;
    message += `📅 <b>Time:</b> ${date}\n`;

    if (context) {
      message += `🔍 <b>Context:</b> ${context}\n`;
    }

    message += `❌ <b>Error:</b> ${error}`;

    await this.sendLogMessage(message);
  }

  async sendStartupNotification(): Promise<void> {
    const date = getCurrentDate();

    let message = `<b>🚀 Signal Trader Started</b>\n\n`;
    message += `📅 <b>Time:</b> ${date}\n`;

    await this.sendLogMessage(message);
  }

  async sendShutdownNotification(): Promise<void> {
    const date = getCurrentDate();

    let message = `<b>🛑 Signal Trader Stopped</b>\n\n`;
    message += `📅 <b>Time:</b> ${date}\n`;

    await this.sendLogMessage(message);
  }
}
