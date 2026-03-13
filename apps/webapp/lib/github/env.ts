export const requiredGitHubEnv = [
  "GITHUB_APP_ID",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_PRIVATE_KEY_PEM",
  "GITHUB_APP_SLUG",
];

export const missingGitHubEnv = () =>
  requiredGitHubEnv.filter((key) => !(process.env[key] ?? "").trim());

export const hasGitHubEnv = () => missingGitHubEnv().length === 0;
