import { Nullable } from "../../utils.d";

export interface TelegramMessage {
  id: number;
  text?: string;
  photo?: string;
  date: Date;
  chatId: number;
}
