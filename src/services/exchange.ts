import * as ccxt from "ccxt";
import { exchangeConfig } from "../config";
import { OrderRequest, TradingSignal } from "../types";
import pinoLogger from "./logger";
import {
  FirebaseService,
  TradingConfig,
  TradingConfigCallback,
} from "./firebase";

export class ExchangeService {
  private exchanges: Map<string, ccxt.binance> = new Map();
  private firebaseService: FirebaseService;
  private tradingConfig: TradingConfig | null = null;

  constructor(userId: string) {
    this.firebaseService = new FirebaseService(userId);
  }

  private getExchangeForChat(chatId: number): ccxt.binance | null {
    const accounts = [exchangeConfig.primary, exchangeConfig.secondary];

    for (const account of accounts) {
      if (account.allowedChatIds.includes(chatId)) {
        const exchange = this.exchanges.get(account.id);

        if (exchange) {
          pinoLogger.info(
            `Using exchange account: ${account.name} for chat ${chatId}`
          );

          return exchange;
        }
      }
    }

    pinoLogger.info(`No exchange account found for chat ${chatId}`);

    return null;
  }

  async initialize(): Promise<void> {
    try {
      const accounts = [exchangeConfig.primary, exchangeConfig.secondary];

      accounts.forEach((account) => {
        if (account.apiKey && account.secret) {
          const exchange = new ccxt.binance({
            apiKey: account.apiKey,
            secret: account.secret,
            enableRateLimit: true,
            options: {
              defaultType: "future",
              hedgeMode: true,
            },
          });

          this.exchanges.set(account.id, exchange);
          pinoLogger.info(
            `Initialized exchange: ${account.name} (${account.id})`
          );

          if (account.allowedChatIds.length > 0) {
            pinoLogger.info(
              `Exchange account ${
                account.id
              } configured for chats: ${account.allowedChatIds.join(", ")}`
            );
          }
        }
      });

      for (const [accountId, exchange] of this.exchanges) {
        await exchange.loadMarkets();

        pinoLogger.info(
          `Connected to Binance exchange - Account: ${accountId}`
        );
      }

      this.tradingConfig = await this.firebaseService.getTradingConfig();
      pinoLogger.info("Trading config loaded from Firebase");

      this.startRealtimeUpdates();
    } catch (error) {
      pinoLogger.error("Failed to initialize exchanges:", error);

      throw error;
    }
  }

  private startRealtimeUpdates(): void {
    const configCallback: TradingConfigCallback = (config: TradingConfig) => {
      this.tradingConfig = config;
      pinoLogger.info("Trading config updated in real-time");
    };

    this.firebaseService.startRealtimeUpdates(configCallback);
  }

  async getBalance(
    currency: string = "USDT",
    chatId?: number
  ): Promise<number> {
    try {
      const exchange = chatId
        ? this.getExchangeForChat(chatId)
        : this.exchanges.get("primary");

      if (!exchange) {
        return 0;
      }

      const balance = await exchange.fetchBalance();

      return balance[currency]?.free || 0;
    } catch (error) {
      pinoLogger.error(`Failed to get ${currency} balance:`, error);

      return 0;
    }
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const exchange = this.exchanges.get("primary");

      if (!exchange) {
        return 0;
      }

      const ticker = await exchange.fetchTicker(symbol);

      return ticker.last || ticker.close || 0;
    } catch (error) {
      pinoLogger.error(`Failed to get price for ${symbol}:`, error);

      return 0;
    }
  }

  async setLeverage(
    symbol: string,
    leverage?: number,
    chatId?: number
  ): Promise<void> {
    try {
      const exchange = chatId
        ? this.getExchangeForChat(chatId)
        : this.exchanges.get("primary");

      if (!exchange) {
        return;
      }

      const defaultLeverage = symbol.includes("BTC") ? 5 : 3;
      const useLeverage = leverage || defaultLeverage;

      await exchange.setLeverage(useLeverage, symbol);

      pinoLogger.info(`Setting leverage for ${symbol} to ${useLeverage}x`);
    } catch (error) {
      pinoLogger.error(`Failed to set leverage for ${symbol}:`, error);
    }
  }

  async executeSignal(signal: TradingSignal): Promise<boolean> {
    if (!this.tradingConfig?.isEnabled) {
      pinoLogger.info("Trading is disabled, skipping signal execution");

      return false;
    }

    if (!signal.isSignal || !signal.action || !signal.symbol) {
      pinoLogger.info("Invalid signal, skipping execution");

      return false;
    }

    try {
      const exchange = this.getExchangeForChat(signal.sourceChatId);

      if (!exchange) {
        pinoLogger.error(
          `No exchange account configured for chat ${signal.sourceChatId}`
        );

        return false;
      }

      await this.setLeverage(
        signal.symbol,
        signal.leverage,
        signal.sourceChatId
      );

      const orderRequest = this.buildOrderRequest(signal);
      const result = await this.executeOrder(orderRequest, exchange);

      if (result) {
        pinoLogger.info(
          `Executing signal: ${signal.action} ${signal.symbol} at ${signal.price}`
        );
      }

      return result;
    } catch (error) {
      pinoLogger.error("Failed to execute signal:", error);

      return false;
    }
  }

  private buildOrderRequest(signal: TradingSignal): OrderRequest {
    const quantity = this.calculatePositionSize(signal);
    const side = signal.action === "close" ? "sell" : signal.action;
    const positionSide = this.determinePositionSide(signal.action);

    const orderRequest: OrderRequest = {
      symbol: signal.symbol!,
      side: side as "buy" | "sell",
      type: signal.orderType,
      amount: quantity,
      positionSide: positionSide,
    };

    if (signal.orderType === "limit" && signal.price) {
      orderRequest.price = signal.price;
    }

    if (signal.stopLoss) {
      orderRequest.stopLoss = signal.stopLoss;
    }

    if (signal.takeProfit) {
      orderRequest.takeProfit = signal.takeProfit;
    }

    return orderRequest;
  }

  private determinePositionSide(action?: string): "long" | "short" {
    if (action === "buy") {
      return "long";
    } else if (action === "sell") {
      return "short";
    }

    return "long";
  }

  private calculatePositionSize(signal: TradingSignal): number {
    if (signal.quantity) {
      return signal.quantity;
    }

    const balance = this.tradingConfig?.maxPositionSize || 100;
    const riskAmount =
      (balance * (this.tradingConfig?.riskPercentage || 2)) / 100;

    if (signal.price) {
      return riskAmount / signal.price;
    }

    return riskAmount / 100;
  }

  private async executeOrder(
    orderRequest: OrderRequest,
    exchange: ccxt.binance
  ): Promise<boolean> {
    try {
      const orderParams: any = {
        positionSide: orderRequest.positionSide,
      };

      const order = await exchange.createOrder(
        orderRequest.symbol,
        orderRequest.type,
        orderRequest.side,
        orderRequest.amount,
        orderRequest.price,
        orderParams
      );

      pinoLogger.info(
        `Created order: ${order.id} (${orderRequest.positionSide})`
      );

      if (orderRequest.stopLoss) {
        const stopOrderParams: any = {
          positionSide: orderRequest.positionSide,
          stopPrice: orderRequest.stopLoss,
        };

        const stopOrder = await exchange.createOrder(
          orderRequest.symbol,
          "stop",
          orderRequest.side === "buy" ? "sell" : "buy",
          orderRequest.amount,
          undefined,
          stopOrderParams
        );

        pinoLogger.info(
          `Created stop loss order: ${stopOrder.id} (${orderRequest.positionSide})`
        );
      }

      if (orderRequest.takeProfit) {
        const takeProfitOrderParams: any = {
          positionSide: orderRequest.positionSide,
        };

        const takeProfitOrder = await exchange.createOrder(
          orderRequest.symbol,
          "limit",
          orderRequest.side === "buy" ? "sell" : "buy",
          orderRequest.amount,
          orderRequest.takeProfit,
          takeProfitOrderParams
        );

        pinoLogger.info(
          `Created take profit order: ${takeProfitOrder.id} (${orderRequest.positionSide})`
        );
      }

      return true;
    } catch (error) {
      pinoLogger.error("Failed to execute order:", error);

      return false;
    }
  }

  async closePosition(
    symbol: string,
    positionSide?: "long" | "short",
    chatId?: number
  ): Promise<boolean> {
    try {
      const exchange = chatId
        ? this.getExchangeForChat(chatId)
        : this.exchanges.get("primary");

      if (!exchange) {
        return false;
      }

      const positions = await exchange.fetchPositions(symbol ? [symbol] : []);

      let position;
      if (positionSide) {
        position = positions.find((p: any) => p.side === positionSide);
      } else {
        position = positions.find(
          (p: any) => p.side === "long" || p.side === "short"
        );
      }

      if (position && (position as any).size > 0) {
        const closeOrderParams: any = {
          positionSide: position.side,
        };

        const closeOrder = await exchange.createOrder(
          symbol,
          "market",
          position.side === "long" ? "sell" : "buy",
          (position as any).size,
          undefined,
          closeOrderParams
        );

        pinoLogger.info(`Closed position: ${closeOrder.id} (${position.side})`);

        return true;
      }

      return false;
    } catch (error) {
      pinoLogger.error("Failed to close position:", error);

      return false;
    }
  }

  async getOpenOrders(symbol?: string, chatId?: number): Promise<any[]> {
    try {
      const exchange = chatId
        ? this.getExchangeForChat(chatId)
        : this.exchanges.get("primary");

      if (!exchange) {
        return [];
      }

      return await exchange.fetchOpenOrders(symbol);
    } catch (error) {
      pinoLogger.error("Failed to get open orders:", error);

      return [];
    }
  }

  async cancelOrder(
    orderId: string,
    symbol: string,
    chatId?: number
  ): Promise<boolean> {
    try {
      const exchange = chatId
        ? this.getExchangeForChat(chatId)
        : this.exchanges.get("primary");

      if (!exchange) {
        return false;
      }

      await exchange.cancelOrder(orderId, symbol);
      pinoLogger.info(`Cancelled order: ${orderId}`);

      return true;
    } catch (error) {
      pinoLogger.error("Failed to cancel order:", error);

      return false;
    }
  }

  async getPositions(symbol?: string, chatId?: number): Promise<any[]> {
    try {
      const exchange = chatId
        ? this.getExchangeForChat(chatId)
        : this.exchanges.get("primary");

      if (!exchange) {
        return [];
      }

      const positions = await exchange.fetchPositions(symbol ? [symbol] : []);

      return positions.filter((p: any) => (p as any).size > 0);
    } catch (error) {
      pinoLogger.error("Failed to get positions:", error);

      return [];
    }
  }

  async getTradingConfig(): Promise<TradingConfig | null> {
    return this.tradingConfig;
  }

  async updateTradingConfig(updates: Partial<TradingConfig>): Promise<void> {
    await this.firebaseService.updateTradingConfig(updates);
  }

  async shutdown(): Promise<void> {
    this.firebaseService.stopRealtimeUpdates();
  }
}
