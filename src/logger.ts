import { createLogger, transports, format } from "winston";
import { formatDate, formatTime } from "./formatters";
const { combine, timestamp, printf } = format;

const formatter = printf(
  ({ level, message, timestamp }) =>
    `[${formatDate(new Date(timestamp), "/")} ${formatTime(
      new Date(timestamp),
      ":",
    )}] [${level.toUpperCase()}]: ${message}`,
);

export const logger = createLogger({
  format: combine(timestamp(), formatter),
  transports: [new transports.Console()],
});
