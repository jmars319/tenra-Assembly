import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

const createClient = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when STORAGE_MODE=db.");
  }

  const pool = global.prismaPool || new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    global.prismaPool = pool;
  }

  // pnpm can surface duplicate @types/pg versions across Prisma and app deps.
  // The runtime object is the same pg Pool instance, so normalize the type at the adapter boundary.
  const adapter = new PrismaPg(pool as unknown as ConstructorParameters<typeof PrismaPg>[0]);
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
};

export const getPrismaClient = () => {
  if (process.env.STORAGE_MODE !== "db") {
    throw new Error("Prisma client requested while STORAGE_MODE is not set to db.");
  }

  if (global.prisma) return global.prisma;
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    global.prisma = client;
  }
  return client;
};
