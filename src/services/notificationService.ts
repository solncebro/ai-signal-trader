import axios from "axios";
import { TradingSignal } from "../types";
import pinoLogger from "./logger";
import { telegramBotConfig } from "../config";

export class NotificationService {
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = telegramBotConfig.botToken;
    this.chatId = telegramBotConfig.chatId;
  }

  async sendLogMessage(message: string): Promise<void> {
    if (!this.botToken || !this.chatId) {
      pinoLogger.warn(
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

  async sendSignalResult(
    signal: TradingSignal,
    success: boolean,
    details?: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    let message = `<b>🔔 Signal Processing Result</b>\n\n`;
    message += `📅 <b>Time:</b> ${timestamp}\n`;
    message += `📱 <b>Source:</b> Chat ${signal.sourceChatId}\n`;
    message += `📊 <b>Signal:</b> ${signal.action?.toUpperCase()} ${
      signal.symbol
    }\n`;
    message += `💰 <b>Price:</b> ${signal.price || "N/A"}\n`;
    message += `🎯 <b>Confidence:</b> ${(signal.confidence * 100).toFixed(
      1
    )}%\n`;
    message += `📝 <b>Message:</b> ${signal.rawMessage.substring(
      0,
      100
    )}...\n\n`;

    if (success) {
      message += `✅ <b>Status:</b> Successfully executed\n`;
    } else {
      message += `❌ <b>Status:</b> Failed to execute\n`;
    }

    if (details) {
      message += `📋 <b>Details:</b> ${details}\n`;
    }

    await this.sendLogMessage(message);
  }

  async sendErrorNotification(error: string, context?: string): Promise<void> {
    const timestamp = new Date().toISOString();

    let message = `<b>🚨 Error Notification</b>\n\n`;
    message += `📅 <b>Time:</b> ${timestamp}\n`;

    if (context) {
      message += `🔍 <b>Context:</b> ${context}\n`;
    }

    message += `❌ <b>Error:</b> ${error}`;

    await this.sendLogMessage(message);
  }

  async sendStartupNotification(): Promise<void> {
    const timestamp = new Date().toISOString();

    let message = `<b>🚀 Signal Trader Started</b>\n\n`;
    message += `📅 <b>Time:</b> ${timestamp}\n`;
    message += `✅ <b>Status:</b> Ready to process signals`;

    await this.sendLogMessage(message);
  }

  async sendShutdownNotification(): Promise<void> {
    const timestamp = new Date().toISOString();

    let message = `<b>🛑 Signal Trader Stopped</b>\n\n`;
    message += `📅 <b>Time:</b> ${timestamp}\n`;
    message += `⏹️ <b>Status:</b> Shutdown complete`;

    await this.sendLogMessage(message);
  }
}
