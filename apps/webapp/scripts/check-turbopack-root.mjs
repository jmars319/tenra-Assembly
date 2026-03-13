import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const riskyLockfiles = [];

let currentDir = repoRoot;
while (true) {
  const candidate = path.join(currentDir, "package-lock.json");
  if (fs.existsSync(candidate)) {
    riskyLockfiles.push(candidate);
  }
  const parentDir = path.dirname(currentDir);
  if (parentDir === currentDir) {
    break;
  }
  currentDir = parentDir;
}

if (riskyLockfiles.length > 0) {
  console.error("\nTurbopack guard: Found package-lock.json files in the current or parent directories:");
  riskyLockfiles.forEach((lockfile) => console.error(`  ${lockfile}`));
  console.error("This can cause Turbopack to resolve the wrong workspace root and break module resolution.");
  console.error("Remove or move that lockfile before using Turbopack, or stick with webpack dev mode.\n");
  process.exit(1);
}

console.log("Turbopack guard: OK.");
