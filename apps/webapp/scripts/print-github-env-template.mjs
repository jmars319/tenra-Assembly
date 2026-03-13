const appUrl = process.env.GITHUB_APP_URL || "";
const slugFromUrl = () => {
  if (!appUrl) return "";
  try {
    const parsed = new URL(appUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const appsIndex = parts.indexOf("apps");
    if (appsIndex !== -1 && parts[appsIndex + 1]) {
      return parts[appsIndex + 1];
    }
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
};

const slug = process.env.GITHUB_APP_SLUG || slugFromUrl();

const value = (key, fallback) => {
  const existing = process.env[key];
  if (!existing) return fallback;
  return "<SET_IN_ENV>";
};

const lines = [
  "# Paste into .env.local (do not commit).",
  `GITHUB_APP_ID=${value("GITHUB_APP_ID", "<PASTE_APP_ID>")}`,
  `GITHUB_CLIENT_ID=${value("GITHUB_CLIENT_ID", "<PASTE_CLIENT_ID>")}`,
  `GITHUB_CLIENT_SECRET=${value("GITHUB_CLIENT_SECRET", "<PASTE_CLIENT_SECRET>")}`,
  `GITHUB_PRIVATE_KEY_PEM=${value(
    "GITHUB_PRIVATE_KEY_PEM",
    "\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\""
  )}`,
  `GITHUB_APP_SLUG=${slug || "<PASTE_APP_SLUG>"}`,
];

console.log(lines.join("\n"));
console.log("\nTip: set GITHUB_APP_URL to auto-derive the slug.");
