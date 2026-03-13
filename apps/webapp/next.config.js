/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const workspaceRoot = path.join(__dirname, "../../");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@assembly/domain", "@assembly/prompts", "@assembly/shared-types"],
  turbopack: {
    root: workspaceRoot,
  },
};

module.exports = nextConfig;
