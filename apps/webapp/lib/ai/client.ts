import "server-only";
import OpenAI from "openai";
import { getPrismaClient } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/workspace/apiKey";

let cached: OpenAI | null = null;
const clientByKey = new Map<string, OpenAI>();

export const getOpenAI = () => {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for AI requests.");
  }
  cached = new OpenAI({ apiKey });
  return cached;
};

export const getOpenAIClient = (apiKey?: string) => {
  if (!apiKey) return getOpenAI();
  const cachedClient = clientByKey.get(apiKey);
  if (cachedClient) return cachedClient;
  const client = new OpenAI({ apiKey });
  clientByKey.set(apiKey, client);
  return client;
};

export const getOpenAIForWorkspace = async (workspaceId: string) => {
  const prisma = getPrismaClient();
  const record = await prisma.workspaceApiKey.findUnique({ where: { workspaceId } });
  if (!record?.apiKeyCipher) {
    return getOpenAI();
  }
  const apiKey = decryptApiKey(record.apiKeyCipher);
  return getOpenAIClient(apiKey);
};
