import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function getCurrentDate(): string {
  return dayjs().utc().format("YYYY.MM.DD HH:mm");
}
