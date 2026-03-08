/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Environment Configuration
 * ─────────────────────────────────────────────────────────
 * Single source of truth for all backend env vars.
 */

export const env = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/solar-intel",

  // Auth — VERCEL_URL is auto-set by Vercel on every deployment
  NEXTAUTH_URL:
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",

  // ML Service (Render.com hosted — cold start can take 30s on free tier)
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "https://solar-intel-ml.onrender.com/predict",
  ML_TIMEOUT_MS: parseInt(process.env.ML_TIMEOUT_MS || "30000", 10),

  // Groq AI (LLM for AI Advisor)
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",

  // Email (Gmail SMTP)
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply.garuda@gmail.com",
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD || "",

  // App
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  // Weather defaults (used when an inverter has no explicit coords)
  WEATHER_PROVIDER: process.env.WEATHER_PROVIDER || "open-meteo",
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || "",
  DEFAULT_LATITUDE: process.env.DEFAULT_LATITUDE || "37.7749",
  DEFAULT_LONGITUDE: process.env.DEFAULT_LONGITUDE || "-122.4194",
} as const;
