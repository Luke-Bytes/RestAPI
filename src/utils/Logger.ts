import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(
      ({ level, message, timestamp }) =>
        `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [
    new transports.Console(),

    new DailyRotateFile({
      filename: "logs/rest_api-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

console.log = (...args: any[]) => logger.info(args.join(" "));
console.info = (...args: any[]) => logger.info(args.join(" "));
console.warn = (...args: any[]) => logger.warn(args.join(" "));
console.error = (...args: any[]) => logger.error(args.join(" "));
console.debug = (...args: any[]) => logger.debug(args.join(" "));

export default logger;
