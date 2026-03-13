export const FEATURE_KEYS = [
  "GITHUB",
  "GITHUB_CONNECT",
  "GITHUB_SYNC",
  "CONTENT_OPS",
  "CONTENT_UPLOAD",
  "SCHEDULING",
  "AI_ASSIST",
  "AI_BRIEFS",
  "AI_CONTENT_ASSIST",
  "AI_SCHEDULER",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  GITHUB: "GitHub integration",
  GITHUB_CONNECT: "GitHub connect/disconnect",
  GITHUB_SYNC: "GitHub sync",
  CONTENT_OPS: "Content Ops",
  CONTENT_UPLOAD: "Content uploads",
  SCHEDULING: "Scheduling",
  AI_ASSIST: "AI assist",
  AI_BRIEFS: "AI briefs",
  AI_CONTENT_ASSIST: "AI content assist",
  AI_SCHEDULER: "AI scheduler",
};
