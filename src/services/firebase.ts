import admin from "firebase-admin";
import pinoLogger from "./logger";
import { firebaseConfig } from "../config";
import { Nullable } from "../../utils.d";

export interface TradingConfig {
  isEnabled: boolean;
  maxPositionSize: number;
  riskPercentage: number;
}

export type TradingConfigCallback = (config: TradingConfig) => void;

export const defaultTradingConfig: TradingConfig = {
  isEnabled: false,
  maxPositionSize: 100,
  riskPercentage: 2,
};

export class FirebaseService {
  private firestoreDatabase!: admin.firestore.Firestore;
  private userId: string;
  private exchange: string;
  private tradeTypeName: string;
  private unsubscribe: Nullable<() => void> = null;

  constructor(
    userId: string,
    exchange: string = "binance",
    tradeTypeName: string = "futures"
  ) {
    this.userId = userId;
    this.exchange = exchange;
    this.tradeTypeName = tradeTypeName;

    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            clientEmail: firebaseConfig.clientEmail,
            privateKey: firebaseConfig.privateKey?.replace(/\n/g, "\n"),
            projectId: firebaseConfig.projectId,
          }),
          projectId: firebaseConfig.projectId,
        });
      }

      this.firestoreDatabase = admin.firestore();

      pinoLogger.info("Firebase initialized successfully");
    } catch (error) {
      pinoLogger.error("Failed to initialize Firebase:", error);

      throw error;
    }
  }

  private getTradingConfigPath(): string {
    return `users/${this.userId}/exchange/${this.exchange}/tradeType/${this.tradeTypeName}/modules/aiSignalTrader`;
  }

  async getTradingConfig(): Promise<TradingConfig> {
    try {
      const docRef = this.firestoreDatabase.doc(this.getTradingConfigPath());
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data() ?? {};
        pinoLogger.info("Retrieved trading config from Firebase");

        return {
          ...defaultTradingConfig,
          ...data,
        };
      } else {
        pinoLogger.info("Trading config not found, returning default config");
      }
    } catch (error) {
      pinoLogger.error("Failed to get trading config from Firebase:", error);
    }

    return defaultTradingConfig;
  }

  startRealtimeUpdates(callback: TradingConfigCallback): void {
    try {
      const docRef = this.firestoreDatabase.doc(this.getTradingConfigPath());

      this.unsubscribe = docRef.onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data() ?? {};
            const config: TradingConfig = {
              ...defaultTradingConfig,
              ...data,
            };

            pinoLogger.info("Trading config updated in real-time:", config);
            callback(config);
          } else {
            pinoLogger.info(
              "Trading config document does not exist, creating default"
            );
            this.setTradingConfig(defaultTradingConfig);
          }
        },
        (error) => {
          pinoLogger.error("Error in real-time updates:", error);
        }
      );

      pinoLogger.info("Started real-time updates for trading config");
    } catch (error) {
      pinoLogger.error("Failed to start real-time updates:", error);
    }
  }

  stopRealtimeUpdates(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      pinoLogger.info("Stopped real-time updates for trading config");
    }
  }

  async setTradingConfig(config: TradingConfig): Promise<void> {
    try {
      const docRef = this.firestoreDatabase.doc(this.getTradingConfigPath());

      await docRef.set(config);

      pinoLogger.info("Trading config saved to Firebase");
    } catch (error) {
      pinoLogger.error("Failed to save trading config to Firebase:", error);

      throw error;
    }
  }

  async updateTradingConfig(updates: Partial<TradingConfig>): Promise<void> {
    try {
      const docRef = this.firestoreDatabase.doc(this.getTradingConfigPath());

      await docRef.update(updates);

      pinoLogger.info("Trading config updated in Firebase");
    } catch (error) {
      pinoLogger.error("Failed to update trading config in Firebase:", error);

      throw error;
    }
  }

  async enableTrading(): Promise<void> {
    await this.updateTradingConfig({ isEnabled: true });
  }

  async disableTrading(): Promise<void> {
    await this.updateTradingConfig({ isEnabled: false });
  }

  async setMaxPositionSize(size: number): Promise<void> {
    await this.updateTradingConfig({ maxPositionSize: size });
  }

  async setRiskPercentage(percentage: number): Promise<void> {
    await this.updateTradingConfig({ riskPercentage: percentage });
  }
}
