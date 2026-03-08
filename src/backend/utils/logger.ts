/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Winston Logger
 * ─────────────────────────────────────────────────────────
 * Structured logging with JSON format for production,
 * colorized console for development.
 */

import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "solar-intel-api" },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : "";
                return `${timestamp} [${level}]: ${message}${metaStr}`;
              })
            ),
    }),
  ],
});

export default logger;
