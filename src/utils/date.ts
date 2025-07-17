import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function formatDate(date: Date): string {
  return dayjs(date).utc().format("YYYY.MM.DD HH:mm");
}

export function getCurrentDate(): string {
  return formatDate(new Date());
}
