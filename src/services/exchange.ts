import * as ccxt from "ccxt";
import { exchangeConfig } from "../config";
import { OrderRequest, TradingSignal } from "../types";
import { Nullable } from "../../utils.d";
import pinoLogger from "./logger";
import {
  FirebaseService,
  TradingConfig,
  TradingConfigCallback,
} from "./firebase";
import { NotificationService } from "./notificationService";

export class ExchangeService {
  private exchanges: Map<string, ccxt.binance> = new Map();
  private firebaseService: FirebaseService;
  private tradingConfig: Nullable<TradingConfig> = null;
  private notificationService: NotificationService;
  private defaultLeverage: number = 5;

  constructor(userId: string, notificationService: NotificationService) {
    this.firebaseService = new FirebaseService(userId);
    this.notificationService = notificationService;
  }

  private getExchangeAccountServiceByChatId(
    chatId: number
  ): Nullable<ccxt.binance> {
    const accountList = [exchangeConfig.primary, exchangeConfig.secondary];

    for (const account of accountList) {
      if (account.allowedChatIdList.includes(chatId)) {
        const exchangeAccountService = this.exchanges.get(account.id);

        if (exchangeAccountService) {
          return exchangeAccountService;
        }
      }
    }

    return null;
  }

  async initialize(): Promise<void> {
    try {
      const accounts = [exchangeConfig.primary, exchangeConfig.secondary];

      accounts.forEach((account) => {
        if (account.apiKey && account.secret) {
          const accountExchange = new ccxt.binance({
            apiKey: account.apiKey,
            secret: account.secret,
            enableRateLimit: true,
            options: {
              defaultType: "future",
              hedgeMode: true,
            },
          });

          this.exchanges.set(account.id, accountExchange);
          pinoLogger.info(
            `Initialized exchange: ${account.name} (${account.id})`
          );

          if (account.allowedChatIdList.length > 0) {
            pinoLogger.info(
              `Account ${
                account.name
              } is configured for chats: ${account.allowedChatIdList.join(
                ", "
              )}`
            );
          }
        }
      });

      for (const [accountId, accountExchange] of this.exchanges) {
        await accountExchange.loadMarkets();

        pinoLogger.info(
          `Connected to Binance exchange - Account: ${accountId}`
        );
      }

      this.tradingConfig = await this.firebaseService.getTradingConfig();
      pinoLogger.info("Trading config loaded");

      this.startRealtimeUpdates();
    } catch (error) {
      pinoLogger.error("Failed to initialize exchanges:", error);

      throw error;
    }
  }

  private startRealtimeUpdates(): void {
    const configCallback: TradingConfigCallback = (config: TradingConfig) => {
      this.tradingConfig = config;
      pinoLogger.info("Trading config updated in real-time from Firebase");
    };

    this.firebaseService.startRealtimeUpdates(configCallback);
  }

  async getBalance(
    currency: string = "USDT",
    chatId?: number
  ): Promise<number> {
    try {
      const exchangeAccountService = chatId
        ? this.getExchangeAccountServiceByChatId(chatId)
        : this.exchanges.get("primary");

      if (!exchangeAccountService) {
        return 0;
      }

      const balance = await exchangeAccountService.fetchBalance();

      return balance[currency]?.free ?? 0;
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

      return ticker.last ?? ticker.close ?? 0;
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
    if (leverage === null || leverage === undefined) {
      return;
    }

    try {
      const exchangeAccountService = chatId
        ? this.getExchangeAccountServiceByChatId(chatId)
        : this.exchanges.get("primary");

      if (!exchangeAccountService) {
        return;
      }

      await exchangeAccountService.setLeverage(leverage, symbol);

      pinoLogger.info(`Setting leverage for ${symbol} to ${leverage}x`);
    } catch (error) {
      pinoLogger.error(`Failed to set leverage for ${symbol}:`, error);

      const errorMessage = `❌ Ошибка установки плеча для ${symbol}: ${leverage}x\nОшибка: ${error}`;

      try {
        await this.notificationService.sendErrorNotification(
          errorMessage,
          `Leverage setting for ${symbol}`
        );
      } catch (notificationError) {
        pinoLogger.error(
          "Failed to send leverage error notification:",
          notificationError
        );
      }
    }
  }

  async executeSignal(
    signal: TradingSignal,
    sourceChatId: number
  ): Promise<boolean> {
    if (!this.tradingConfig?.isEnabled) {
      pinoLogger.info("Trading is disabled, skipping signal execution");

      return false;
    }

    const { action, symbol, leverage } = signal;

    if (!action || !symbol) {
      pinoLogger.info("Invalid symbol or action, skipping execution");

      return false;
    }

    const exchangeAccountService =
      this.getExchangeAccountServiceByChatId(sourceChatId);

    if (!exchangeAccountService) {
      pinoLogger.error(
        `No exchange account service found for chat ${sourceChatId}`
      );

      return false;
    }

    pinoLogger.info(
      `Using exchange account service: ${exchangeAccountService.name} for chat ${sourceChatId}`
    );

    try {
      await this.setLeverage(
        symbol,
        leverage ?? this.defaultLeverage,
        sourceChatId
      );

      const orderRequest = this.buildOrderRequest(signal);
      const result = await this.executeOrder(
        orderRequest,
        exchangeAccountService
      );

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
    const positionSide = this.determinePositionSide(signal.action ?? undefined);

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

    const balance = this.tradingConfig?.maxPositionSize ?? 100;
    const riskAmount =
      (balance * (this.tradingConfig?.riskPercentage ?? 2)) / 100;

    if (signal.price) {
      return riskAmount / signal.price;
    }

    return riskAmount / 100;
  }

  private async executeOrder(
    orderRequest: OrderRequest,
    exchangeAccountService: ccxt.binance
  ): Promise<boolean> {
    try {
      const orderParams: any = {
        positionSide: orderRequest.positionSide,
      };

      const order = await exchangeAccountService.createOrder(
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

        const stopOrder = await exchangeAccountService.createOrder(
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

        const takeProfitOrder = await exchangeAccountService.createOrder(
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
      const exchangeAccountService = chatId
        ? this.getExchangeAccountServiceByChatId(chatId)
        : this.exchanges.get("primary");

      if (!exchangeAccountService) {
        return false;
      }

      const positions = await exchangeAccountService.fetchPositions(
        symbol ? [symbol] : []
      );

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

        const closeOrder = await exchangeAccountService.createOrder(
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
      const exchangeAccountService = chatId
        ? this.getExchangeAccountServiceByChatId(chatId)
        : this.exchanges.get("primary");

      if (!exchangeAccountService) {
        return [];
      }

      return await exchangeAccountService.fetchOpenOrders(symbol);
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
      const exchangeAccountService = chatId
        ? this.getExchangeAccountServiceByChatId(chatId)
        : this.exchanges.get("primary");

      if (!exchangeAccountService) {
        return false;
      }

      await exchangeAccountService.cancelOrder(orderId, symbol);
      pinoLogger.info(`Cancelled order: ${orderId}`);

      return true;
    } catch (error) {
      pinoLogger.error("Failed to cancel order:", error);

      return false;
    }
  }

  async getPositions(symbol?: string, chatId?: number): Promise<any[]> {
    try {
      const exchangeAccountService = chatId
        ? this.getExchangeAccountServiceByChatId(chatId)
        : this.exchanges.get("primary");

      if (!exchangeAccountService) {
        return [];
      }

      const positions = await exchangeAccountService.fetchPositions(
        symbol ? [symbol] : []
      );

      return positions.filter((p: any) => (p as any).size > 0);
    } catch (error) {
      pinoLogger.error("Failed to get positions:", error);

      return [];
    }
  }

  async getTradingConfig(): Promise<Nullable<TradingConfig>> {
    return this.firebaseService.getTradingConfig();
  }

  async updateTradingConfig(updates: Partial<TradingConfig>): Promise<void> {
    await this.firebaseService.updateTradingConfig(updates);
  }

  async shutdown(): Promise<void> {
    this.firebaseService.stopRealtimeUpdates();
  }
}
