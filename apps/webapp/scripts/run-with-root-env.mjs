import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");

const envCandidates = [
  path.join(repoRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(appRoot, ".env"),
  path.join(appRoot, ".env.local"),
];

envCandidates.forEach((envPath, index) => {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: index !== 0 });
  }
});

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("run-with-root-env.mjs requires a command to execute.");
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: appRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
