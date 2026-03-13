import { createDbStore } from "./db";
import { createMemoryStore } from "./memory";
import type { StorageAdapter } from "./types";

const storeByWorkspace = new Map<string, StorageAdapter>();

export const getStore = (workspaceId: string): StorageAdapter => {
  const cached = storeByWorkspace.get(workspaceId);
  if (cached) return cached;
  const mode = process.env.STORAGE_MODE ?? "memory";
  if (mode === "db" && !process.env.DATABASE_URL) {
    throw new Error("STORAGE_MODE=db requires DATABASE_URL to be set.");
  }
  const adapter = mode === "db" ? createDbStore(workspaceId) : createMemoryStore(workspaceId);
  storeByWorkspace.set(workspaceId, adapter);
  return adapter;
};
