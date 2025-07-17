import axios from "axios";
import { openaiApiKey } from "../config";
import {
  MultipleTradingSignals,
  TelegramMessage,
  TradingSignal,
} from "../types";
import pinoLogger from "./logger";

export class SignalAnalyzer {
  private readonly openaiApiUrl = "https://api.openai.com/v1/chat/completions";

  async analyzeMessageForMultipleSignals(
    message: TelegramMessage
  ): Promise<MultipleTradingSignals> {
    try {
      const prompt = this.buildPromptForMultipleSignals(message);

      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert in analyzing cryptocurrency trading signals. 
              Your task is to determine if a message contains trading signals and extract all trading information from it.
              
              A single message may contain multiple trading signals for different symbols or the same symbol.
              For example: "BTC/USDT BUY 45000, ETH/USDT SELL 3000" contains 2 signals.
              
              Response format must be JSON:
              {
                "signals": [
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
                ],
                "hasMultipleSignals": boolean
              }
              
              Order type (orderType):
              - "market" - if mentioned "market", "now", "immediately", "at market", "current price"
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
        },
        {
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      const signalList: TradingSignal[] = (parsed.signals || []).map(
        (signal: any) => ({
          isSignal: signal.isSignal,
          action: signal.action,
          symbol: signal.symbol,
          price: signal.price,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          quantity: signal.quantity,
          orderType: signal.orderType || "market",
          leverage: signal.leverage === null ? undefined : signal.leverage,
          sourceChatId: message.chatId,
          confidence: signal.confidence,
          rawMessage: message.text || "",
        })
      );

      return {
        signalList,
        sourceChatId: message.chatId,
        rawMessage: message.text || "",
        hasMultipleSignals: parsed.hasMultipleSignals || signalList.length > 1,
      };
    } catch (error) {
      pinoLogger.error(
        "Failed to analyze message for multiple signals:",
        error
      );

      return {
        signalList: [],
        sourceChatId: message.chatId,
        rawMessage: message.text || "",
        hasMultipleSignals: false,
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
