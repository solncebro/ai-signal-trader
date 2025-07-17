import OpenAI from "openai";
import { openaiApiKey } from "../config";
import {
  LlmTradingSignalsResponse,
  MultipleTradingSignals,
  TelegramMessage,
  TradingSignal,
} from "../types";
import pinoLogger from "./logger";
import { NotificationService } from "./notificationService";
import { ensureNumber } from "../utils/number";

export class SignalAnalyzer {
  private readonly openAiService: OpenAI;
  private readonly notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.openAiService = new OpenAI({
      apiKey: openaiApiKey,
    });
    this.notificationService = notificationService;
  }

  async analyzeMessageForMultipleSignals(
    message: TelegramMessage
  ): Promise<MultipleTradingSignals> {
    try {
      const prompt = this.buildPromptForMultipleSignals(message);

      const response = await this.openAiService.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert in extracting cryptocurrency trading signals from messages from text and/or photo. 
            Your task is to determine if a message contains trading signals and extract all trading information from it.
            
            A single message may contain multiple trading signals for different symbols or the same symbol.
            For example: "BTC/USDT BUY 45000, ETH/USDT SELL 3000" contains 2 signals.
            
            Response format must be JSON:
            {
              "signalList": [
                {
                  "isSignal": boolean,
                  "action": "buy" | "sell" | "close" | Nullable<string>,
                  "symbol": "BTC/USDT" | Nullable<string>,
                  "price": number | Nullable<number>,
                  "stopLoss": number | Nullable<number>,
                  "takeProfit": number | Nullable<number>,
                  "quantity": number | Nullable<number>,
                  "orderType": "market" | "limit",
                  "leverage": number | Nullable<number>,
                  "confidence": number (0-1),
                  "reasoning": string
                }
              ]
            }
            
            Order type (orderType):
            - "market" - if mentioned "buy set up", "market", "now", "immediately", "at market", "current price"
            - "limit" - if a specific entry price is mentioned
            - Default to "market" if not explicitly specified
            
            Leverage (leverage):
            - Extract the leverage value if mentioned in the message (e.g. "leverage 10x", "10x", "with 10x leverage").
            - If not specified, set leverage to null.
            
            If this is not a trading signal, return empty signals array and hasMultipleSignals: false.
            
            Always return an array of signals, even if there's only one signal.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const usage = response.usage;

      if (usage) {
        const tokenMessage = `🔍 Message analysis completed\n\n📊 Token usage:\n• Input: ${usage.prompt_tokens} tokens\n• Output: ${usage.completion_tokens} tokens\n• Total: ${usage.total_tokens} tokens`;

        await this.notificationService.sendLogMessage(tokenMessage);
      }

      const parsed: LlmTradingSignalsResponse = JSON.parse(content);

      const signalList: TradingSignal[] = (parsed.signalList ?? []).map(
        (signal: Partial<TradingSignal>) => {
          const {
            isSignal,
            price,
            stopLoss,
            takeProfit,
            quantity,
            orderType,
            leverage,
            confidence,
          } = signal;

          return {
            ...signal,
            isSignal: Boolean(isSignal),
            price: ensureNumber(price),
            stopLoss: ensureNumber(stopLoss),
            takeProfit: ensureNumber(takeProfit),
            quantity: ensureNumber(quantity),
            orderType: orderType === "limit" ? "limit" : "market",
            leverage: ensureNumber(leverage),
            confidence: ensureNumber(confidence) ?? 0,
          };
        }
      );

      return {
        signalList,
        sourceChatId: message.chatId,
        rawMessage: message.text ?? "",
      };
    } catch (error) {
      pinoLogger.error(
        "Failed to analyze message for multiple signals:",
        error
      );

      return {
        signalList: [],
        sourceChatId: message.chatId,
        rawMessage: message.text ?? "",
      };
    }
  }

  private buildPromptForMultipleSignals(message: TelegramMessage): string {
    let prompt = `Analyze the following message and extract ALL trading signals from it:\n\n`;

    if (message.text) {
      prompt += `Text: ${message.text}\n\n`;
    }

    if (message.photo) {
      prompt += `Photo (base64):\n${message.photo}\n\n`;
    }

    prompt += `Look for multiple signals in the same message. Each signal should be a separate object in the signals array.\n`;
    prompt += `Respond in JSON format as specified in the instructions.`;

    return prompt;
  }
}
