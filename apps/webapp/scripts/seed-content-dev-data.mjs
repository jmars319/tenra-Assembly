import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env");
const envLocalPath = path.join(repoRoot, ".env.local");

if (existsSync(envPath)) {
  config({ path: envPath });
}
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}

if (process.env.NODE_ENV === "production") {
  console.error("content:seed: Refusing to run in production.");
  process.exit(1);
}

if (process.env.STORAGE_MODE !== "db") {
  console.error("content:seed: STORAGE_MODE=db is required.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("content:seed: DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const now = new Date();

const seedItems = [
  {
    id: "content-field-note-001",
    type: "FIELD_NOTE",
    status: "DRAFT",
    title: "Field note: internal workflow",
    summary: "Monthly snapshot of pipeline reliability work.",
    structured: { bullets: ["Queue latency down 18%", "Audit trail cleaned up", "Repo allowlist verified"] },
    body: "- Queue latency down 18%\n- Audit trail cleaned up\n- Repo allowlist verified",
    source: "MANUAL",
    cadenceTarget: "MONTHLY",
    topics: ["ops", "workflow"],
    relatedSlugs: [],
  },
  {
    id: "content-systems-memo-001",
    type: "SYSTEMS_MEMO",
    status: "APPROVED",
    title: "Systems memo: guardrails before automation",
    summary: "Why approvals are the core invariant.",
    structured: {
      thesis: "Approvals are the system boundary, not a UX detail.",
      points: ["Evidence first", "Human intent is the source of truth", "Automation only after review"],
      example: "Assembly refuses to post without an approval record.",
      takeaway: "Automate flow, never authorship.",
    },
    source: "MANUAL",
    cadenceTarget: "SIX_WEEKS",
    topics: ["approvals", "trust"],
    relatedSlugs: [],
  },
  {
    id: "content-blog-feature-001",
    type: "BLOG_FEATURE",
    status: "DRAFT",
    title: "Keeping case studies alive without busywork",
    summary: "A practical workflow for ongoing updates.",
    structured: {
      title: "Keeping case studies alive without busywork",
      primary_keyword: "case study maintenance",
      related_keywords: ["content ops", "client updates"],
      internal_links: ["/content"],
      source_links: [],
      body: "Intro...\n\n## Why freshness matters\n\n...\n",
    },
    body: "Intro...\n\n## Why freshness matters\n\n...\n",
    source: "MANUAL",
    cadenceTarget: "BIMONTHLY",
    topics: ["case study maintenance", "content ops"],
    relatedSlugs: ["mmh-seating"],
  },
  {
    id: "content-change-log-001",
    type: "CHANGE_LOG",
    status: "READY",
    title: "Change log: approvals UI",
    summary: "Streamlined approval flows for posts.",
    structured: { date: "2026-01-04", change: "Approval buttons consolidated", impact: "Faster reviews" },
    source: "MANUAL",
    topics: [],
    relatedSlugs: [],
  },
  {
    id: "content-change-log-002",
    type: "CHANGE_LOG",
    status: "READY",
    title: "Change log: audit cleanup",
    summary: "Audit log now includes schedule notes.",
    structured: { date: "2026-01-07", change: "Audit notes expanded", impact: "Better traceability" },
    source: "MANUAL",
    topics: [],
    relatedSlugs: [],
  },
  {
    id: "content-decision-record-001",
    type: "DECISION_RECORD",
    status: "APPROVED",
    title: "ADR-lite: no auto-posting",
    summary: "Explicit approvals remain mandatory.",
    structured: {
      context: "Need to prove safe automation boundaries.",
      decision: "No auto-posting without explicit human approval.",
      tradeoffs: "Slower throughput, but higher trust.",
      outcome: "All post execution stays manual or explicitly approved.",
    },
    source: "MANUAL",
    topics: [],
    relatedSlugs: [],
  },
  {
    id: "content-signal-log-001",
    type: "SIGNAL_LOG",
    status: "DRAFT",
    title: "Signal: ops teams want visibility",
    summary: "Teams want an audit trail before automation.",
    structured: {
      date: "2026-01-06",
      signal: "Teams demand audit trails before automation.",
      tags: ["trust", "ops"],
      link: "",
    },
    source: "MANUAL",
    topics: ["trust", "ops"],
    relatedSlugs: [],
  },
  {
    id: "content-signal-log-002",
    type: "SIGNAL_LOG",
    status: "DRAFT",
    title: "Signal: docs-first workflows",
    summary: "Docs-first onboarding reduces follow-up questions.",
    structured: {
      date: "2026-01-08",
      signal: "Docs-first onboarding reduces follow-up questions.",
      tags: ["docs", "onboarding"],
      link: "",
    },
    source: "MANUAL",
    topics: ["docs", "onboarding"],
    relatedSlugs: [],
  },
  {
    id: "content-project-note-001",
    type: "PROJECT_NOTE",
    status: "DRAFT",
    title: "Performance delta",
    summary: "Seat map load reduced.",
    structured: {
      caseStudySlug: "mmh-seating",
      date: "2026-01-09",
      metric: "Performance",
      detail: "Reduced seating modal load time by ~40% by deferring map assets.",
      sourceLink: "",
    },
    source: "MANUAL",
    topics: ["performance"],
    relatedSlugs: ["mmh-seating"],
  },
  {
    id: "content-project-note-002",
    type: "PROJECT_NOTE",
    status: "DRAFT",
    title: "Reliability delta",
    summary: "Seat selection error messaging improved.",
    structured: {
      caseStudySlug: "mmh-seating",
      date: "2026-01-12",
      metric: "Reliability",
      detail: "Improved seat rejection logging and user-facing reason codes.",
      sourceLink: "",
    },
    source: "MANUAL",
    topics: ["reliability"],
    relatedSlugs: ["mmh-seating"],
  },
  {
    id: "content-project-note-003",
    type: "PROJECT_NOTE",
    status: "DRAFT",
    title: "UX delta",
    summary: "Layout refresh workflow.",
    structured: {
      caseStudySlug: "mmh-seating",
      date: "2026-01-14",
      metric: "UX",
      detail: "Admins can refresh seating layouts without reassigning seats.",
      sourceLink: "",
    },
    source: "MANUAL",
    topics: ["ux"],
    relatedSlugs: ["mmh-seating"],
  },
];

const upsertContentItem = async (item) => {
  await prisma.contentItem.upsert({
    where: { id: item.id },
    update: {
      type: item.type,
      status: item.status,
      title: item.title,
      summary: item.summary,
      body: item.body ?? null,
      structured: item.structured,
      rawInput: item.rawInput ?? null,
      source: item.source,
      cadenceTarget: item.cadenceTarget ?? null,
      topics: item.topics ?? [],
      relatedSlugs: item.relatedSlugs ?? [],
      updatedAt: now,
    },
    create: {
      ...item,
      createdAt: now,
      updatedAt: now,
    },
  });
};

try {
  for (const item of seedItems) {
    await upsertContentItem(item);
  }

  console.log("content:seed: OK");
} catch (err) {
  console.error("content:seed: FAILED", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
