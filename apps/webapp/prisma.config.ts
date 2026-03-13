import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

[
  path.join(repoRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(__dirname, ".env"),
  path.join(__dirname, ".env.local"),
].forEach((envPath, index) => {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: index !== 0 });
  }
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
