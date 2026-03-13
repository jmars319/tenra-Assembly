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
  console.error("seed-dev-data: Refusing to run in production.");
  process.exit(1);
}

if (process.env.STORAGE_MODE !== "db") {
  console.error("seed-dev-data: STORAGE_MODE must be set to db.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("seed-dev-data: DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysAhead = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const ids = {
  project: "project-assembly-internal",
  brief: "brief-assembly-internal",
  posts: [
    "post-assembly-li",
    "post-assembly-x",
    "post-assembly-fb",
  ],
  schedule: "schedule-assembly-001",
  scheduleItems: [
    "schedule-item-assembly-li",
    "schedule-item-assembly-x",
    "schedule-item-assembly-fb",
  ],
  task: "task-assembly-manual-001",
  auditLogs: [
    "audit-assembly-project",
    "audit-assembly-brief",
    "audit-assembly-post-li",
    "audit-assembly-post-x",
    "audit-assembly-post-fb",
    "audit-assembly-schedule",
    "audit-assembly-task",
  ],
};

async function main() {
  const legacyProject = await prisma.project.findUnique({
    where: { tag: "LEDGER_INTERNAL" },
  });

  if (legacyProject) {
    await prisma.project.update({
      where: { id: legacyProject.id },
      data: { name: "Assembly (Internal)", tag: "ASSEMBLY_INTERNAL" },
    });
  }

  const project = await prisma.project.upsert({
    where: { tag: "ASSEMBLY_INTERNAL" },
    update: { name: "Assembly (Internal)" },
    create: {
      id: ids.project,
      name: "Assembly (Internal)",
      tag: "ASSEMBLY_INTERNAL",
    },
  });


  await prisma.brief.upsert({
    where: { id: ids.brief },
    update: {
      summary:
        "Internal brief: Assembly scaffolding updates are ready for review.\n" +
        "What changed: new auth flow, API routes, and Prisma 7 config.\n" +
        "Why it matters: validates review workflow end-to-end for dogfooding.\n" +
        "Constraints: no external integrations, no automated posting, workspace-controlled access.",
      projectId: project.id,
    },
    create: {
      id: ids.brief,
      projectId: project.id,
      summary:
        "Internal brief: Assembly scaffolding updates are ready for review.\n" +
        "What changed: new auth flow, API routes, and Prisma 7 config.\n" +
        "Why it matters: validates review workflow end-to-end for dogfooding.\n" +
        "Constraints: no external integrations, no automated posting, workspace-controlled access.",
      createdAt: daysAgo(4),
    },
  });

  const postData = [
    {
      id: ids.posts[0],
      platform: "LinkedIn",
      title: "Assembly internal ops panel (post)",
      postJson: {
        headline: "Assembly internal ops panel is ready for review",
        body: "Posting a quick internal update for the team. Focus is on review workflow and guardrails, not launch messaging.",
        cta: "Reply with feedback",
      },
      claims: ["Internal-only update", "No external release"],
    },
    {
      id: ids.posts[1],
      platform: "X",
      title: "Assembly ops update (post)",
      postJson: {
        text: "Post: Assembly ops panel ready for internal review. Keeping scope tight: auth gate, review queues, and audit logs.",
      },
      claims: ["Internal review stage"],
    },
    {
      id: ids.posts[2],
      platform: "Facebook",
      title: "Assembly pipeline note (post)",
      postJson: {
        headline: "Assembly pipeline update",
        body: "This is a rough internal post meant for review. No external posting yet.",
      },
      claims: ["Post quality"],
    },
  ];

  for (const post of postData) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {
        projectId: project.id,
        platform: post.platform,
        title: post.title,
        status: "NEEDS_REVIEW",
        postJson: post.postJson,
        claims: post.claims,
      },
      create: {
        id: post.id,
        projectId: project.id,
        platform: post.platform,
        title: post.title,
        status: "NEEDS_REVIEW",
        postJson: post.postJson,
        claims: post.claims,
        createdAt: daysAgo(3),
      },
    });
  }

  await prisma.scheduleProposal.upsert({
    where: { id: ids.schedule },
    update: {
      projectId: project.id,
      status: "NEEDS_REVIEW",
    },
    create: {
      id: ids.schedule,
      projectId: project.id,
      status: "NEEDS_REVIEW",
      createdAt: daysAgo(2),
    },
  });

  const scheduleItems = [
    {
      id: ids.scheduleItems[0],
      postId: ids.posts[0],
      channel: "LinkedIn",
      scheduledFor: daysAhead(3),
    },
    {
      id: ids.scheduleItems[1],
      postId: ids.posts[1],
      channel: "X",
      scheduledFor: daysAhead(2),
    },
    {
      id: ids.scheduleItems[2],
      postId: ids.posts[2],
      channel: "Facebook",
      scheduledFor: daysAhead(4),
    },
  ];

  for (const item of scheduleItems) {
    await prisma.scheduleItem.upsert({
      where: { id: item.id },
      update: {
        scheduleProposalId: ids.schedule,
        postId: item.postId,
        channel: item.channel,
        scheduledFor: item.scheduledFor,
      },
      create: {
        id: item.id,
        scheduleProposalId: ids.schedule,
        postId: item.postId,
        channel: item.channel,
        scheduledFor: item.scheduledFor,
      },
    });
  }

  await prisma.task.upsert({
    where: { id: ids.task },
    update: {
      projectId: project.id,
      title: "Manual post required",
      status: "PENDING",
      dueAt: daysAhead(2),
      copyText:
        "Manual posting required for internal update. Confirm final copy after approvals.",
    },
    create: {
      id: ids.task,
      projectId: project.id,
      title: "Manual post required",
      status: "PENDING",
      dueAt: daysAhead(2),
      copyText:
        "Manual posting required for internal update. Confirm final copy after approvals.",
      createdAt: daysAgo(1),
    },
  });

  const auditEntries = [
    {
      id: ids.auditLogs[0],
      actor: "system:project_assistant",
      action: "PROJECT_SEEDED",
      entityType: "Project",
      entityId: project.id,
      note: "Seeded internal project for local workflow review.",
      createdAt: daysAgo(4),
    },
    {
      id: ids.auditLogs[1],
      actor: "system:project_assistant",
      action: "BRIEF_GENERATED",
      entityType: "Brief",
      entityId: ids.brief,
      note: "Generated internal brief for review.",
      createdAt: daysAgo(4),
    },
    {
      id: ids.auditLogs[2],
      actor: "system:drafter",
      action: "POST_GENERATED",
      entityType: "Post",
      entityId: ids.posts[0],
      note: "Generated post for LinkedIn review.",
      createdAt: daysAgo(3),
    },
    {
      id: ids.auditLogs[3],
      actor: "system:drafter",
      action: "POST_GENERATED",
      entityType: "Post",
      entityId: ids.posts[1],
      note: "Generated post for X review.",
      createdAt: daysAgo(3),
    },
    {
      id: ids.auditLogs[4],
      actor: "system:drafter",
      action: "POST_GENERATED",
      entityType: "Post",
      entityId: ids.posts[2],
      note: "Generated post for Facebook review.",
      createdAt: daysAgo(3),
    },
    {
      id: ids.auditLogs[5],
      actor: "system:scheduler",
      action: "SCHEDULE_PROPOSED",
      entityType: "ScheduleProposal",
      entityId: ids.schedule,
      note: "Proposed post schedule based on review readiness.",
      createdAt: daysAgo(2),
    },
    {
      id: ids.auditLogs[6],
      actor: "system:project_assistant",
      action: "TASK_CREATED",
      entityType: "Task",
      entityId: ids.task,
      note: "Created manual posting task for review flow.",
      createdAt: daysAgo(1),
    },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.upsert({
      where: { id: entry.id },
      update: {
        actor: entry.actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        note: entry.note,
        createdAt: entry.createdAt,
      },
      create: entry,
    });
  }

  console.log("seed-dev-data: Done.");
}

main()
  .catch((error) => {
    console.error("seed-dev-data: FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
