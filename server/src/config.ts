import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root (two levels above src/)
dotenvConfig({ path: resolve(__dirname, "../../.env") });

export const config = {
  port: 7771,
  host: "localhost",
  jwtSecret: process.env.JWT_SECRET || "farmy-dev-secret",
  jwtExpiry: "24h",
  cookieName: "farmy_token",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "file:./prisma/farmy.db",
  isTest: process.env.NODE_ENV === "test",
} as const;
