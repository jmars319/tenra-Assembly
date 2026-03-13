import "server-only";
import crypto from "node:crypto";

const PRIMARY_KEY_ENV = "ASSEMBLY_KMS_KEY";
const LEGACY_KEY_ENV = "LEDGER_KMS_KEY";

const getKey = () => {
  const raw = process.env[PRIMARY_KEY_ENV] || process.env[LEGACY_KEY_ENV];
  if (!raw) {
    throw new Error(`${PRIMARY_KEY_ENV} is required to encrypt workspace API keys. ${LEGACY_KEY_ENV} is still accepted as a fallback.`);
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(`${PRIMARY_KEY_ENV} must be a 32-byte key (hex or base64). ${LEGACY_KEY_ENV} is still accepted as a fallback.`);
  }
  return key;
};

export const encryptApiKey = (value: string) => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptApiKey = (value: string) => {
  const [version, ivB64, tagB64, dataB64] = value.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unsupported API key cipher format.");
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
};
