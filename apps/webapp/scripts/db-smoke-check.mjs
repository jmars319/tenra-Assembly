import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env");
const envLocalPath = path.join(repoRoot, ".env.local");

if (existsSync(envPath)) {
  config({ path: envPath });
}
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}

if (process.env.STORAGE_MODE !== "db") {
  console.error("db-smoke: STORAGE_MODE=db is required for this check.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("db-smoke: DATABASE_URL is required for this check.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  await client.$queryRaw`SELECT 1`;
  console.log("db-smoke: OK");
} catch (err) {
  console.error("db-smoke: FAILED", err);
  process.exitCode = 1;
} finally {
  await client.$disconnect();
  await pool.end();
}
