import { getPrismaClient } from "@/lib/prisma";
import { getAuditLabel } from "@/lib/audit/labels";
import type {
  AuditLog as PrismaAuditLog,
  Brief as PrismaBrief,
  Prisma,
  Post as PrismaPost,
  RepoAccess as PrismaRepoAccess,
  ScheduleItem as PrismaScheduleItem,
  ScheduleProposal as PrismaScheduleProposal,
  Task as PrismaTask,
} from "@prisma/client";
import {
  AuditLog,
  DashboardSummary,
  Post,
  PostStatus,
  InboxSummary,
  RepoAccess,
  ScheduleProposal,
  ScheduleStatus,
  StorageAdapter,
  Task,
  TaskStatus,
} from "./types";

const mapPost = (post: PrismaPost): Post => ({
  id: post.id,
  projectId: post.projectId,
  platform: post.platform,
  title: post.title,
  status: post.status,
  postJson: (post.postJson ?? {}) as Record<string, unknown>,
  claims: post.claims ?? [],
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

const mapSchedule = (schedule: PrismaScheduleProposal & { items: PrismaScheduleItem[] }): ScheduleProposal => ({
  id: schedule.id,
  projectId: schedule.projectId,
  status: schedule.status,
  items: (schedule.items ?? []).map((item) => ({
    id: item.id,
    postId: item.postId,
    channel: item.channel,
    scheduledFor: item.scheduledFor.toISOString(),
  })),
  createdAt: schedule.createdAt.toISOString(),
  updatedAt: schedule.updatedAt.toISOString(),
});

const mapTask = (task: PrismaTask): Task => ({
  id: task.id,
  projectId: task.projectId,
  title: task.title,
  status: task.status,
  dueAt: task.dueAt.toISOString(),
  copyText: task.copyText,
});

const mapRepo = (repo: PrismaRepoAccess): RepoAccess => ({
  id: repo.id,
  repo: repo.repo,
  projectTag: repo.projectTag,
  enabled: repo.enabled,
  triggerPosts: repo.triggerPosts,
  triggerSchedules: repo.triggerSchedules,
  triggerTasks: repo.triggerTasks,
});

const mapAudit = (audit: PrismaAuditLog): AuditLog => ({
  id: audit.id,
  createdAt: audit.createdAt.toISOString(),
  actor: audit.actor,
  action: audit.action,
  entityType: audit.entityType,
  entityId: audit.entityId,
  note: audit.note ?? undefined,
  metadata: (audit.metadata as Record<string, unknown> | null) ?? undefined,
});

const mapBrief = (brief: PrismaBrief) => ({
  id: brief.id,
  projectId: brief.projectId,
  evidenceBundleId: brief.evidenceBundleId ?? undefined,
  sourceRepoId: brief.sourceRepoId ?? undefined,
  summary: brief.summary,
  createdAt: brief.createdAt.toISOString(),
});

const createAuditLog = async (
  workspaceId: string,
  entry: Omit<AuditLog, "id" | "createdAt">,
) => {
  const prisma = getPrismaClient();
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actor: entry.actor,
      action: entry.action,
      actionLabel: getAuditLabel(entry.action),
      entityType: entry.entityType,
      entityId: entry.entityId,
      note: entry.note,
      metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
};

export const createDbStore = (workspaceId: string): StorageAdapter => ({
  async getDashboard(): Promise<DashboardSummary> {
    const prisma = getPrismaClient();
    const [postsReady, schedulesReady, tasksDue, recentAudit] = await Promise.all([
      prisma.post.count({ where: { status: "NEEDS_REVIEW", workspaceId } }),
      prisma.scheduleProposal.count({ where: { status: "NEEDS_REVIEW", workspaceId } }),
      prisma.task.count({ where: { status: "PENDING", workspaceId } }),
      prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      counts: {
        postsReady,
        schedulesReady,
        tasksDue,
      },
      recentAudit: recentAudit.map(mapAudit),
    };
  },

  async listInbox(): Promise<InboxSummary> {
    const prisma = getPrismaClient();
    const [posts, schedules] = await Promise.all([
      prisma.post.findMany({ where: { status: "NEEDS_REVIEW", workspaceId } }),
      prisma.scheduleProposal.findMany({
        where: { status: "NEEDS_REVIEW", workspaceId },
        include: { items: true },
      }),
    ]);

    return {
      posts: posts.map(mapPost),
      schedules: schedules.map(mapSchedule),
    };
  },

  async listProjects() {
    const prisma = getPrismaClient();
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      tag: project.tag,
    }));
  },

  async listBriefs() {
    const prisma = getPrismaClient();
    const briefs = await prisma.brief.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return briefs.map(mapBrief);
  },

  async getBrief(id: string) {
    const prisma = getPrismaClient();
    const brief = await prisma.brief.findFirst({ where: { id, workspaceId } });
    return brief ? mapBrief(brief) : null;
  },

  async listPosts() {
    const prisma = getPrismaClient();
    const posts = await prisma.post.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
    });
    return posts.map(mapPost);
  },

  async getPost(id: string) {
    const prisma = getPrismaClient();
    const post = await prisma.post.findFirst({ where: { id, workspaceId } });
    return post ? mapPost(post) : null;
  },

  async updatePostStatus(id: string, status: PostStatus, note?: string) {
    const prisma = getPrismaClient();
    const existing = await prisma.post.findFirst({ where: { id, workspaceId } });
    if (!existing) return null;

    const post = await prisma.post.update({
      where: { id },
      data: { status },
    });

    await createAuditLog(workspaceId, {
      actor: "admin",
      action: `POST_${status}`,
      entityType: "Post",
      entityId: id,
      note,
    });

    return mapPost(post);
  },

  async getSchedule(id: string) {
    const prisma = getPrismaClient();
    const schedule = await prisma.scheduleProposal.findUnique({
      where: { id },
      include: { items: true },
    });
    return schedule?.workspaceId === workspaceId ? mapSchedule(schedule) : null;
  },

  async listSchedules() {
    const prisma = getPrismaClient();
    const schedules = await prisma.scheduleProposal.findMany({
      where: { workspaceId },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
    });
    return schedules.map(mapSchedule);
  },

  async updateScheduleStatus(id: string, status: ScheduleStatus, note?: string) {
    const prisma = getPrismaClient();
    const existing = await prisma.scheduleProposal.findFirst({ where: { id, workspaceId } });
    if (!existing) return null;

    const schedule = await prisma.scheduleProposal.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    await createAuditLog(workspaceId, {
      actor: "admin",
      action: `SCHEDULE_${status}`,
      entityType: "ScheduleProposal",
      entityId: id,
      note,
    });

    return mapSchedule(schedule);
  },

  async listTasks() {
    const prisma = getPrismaClient();
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      orderBy: { dueAt: "asc" },
    });
    return tasks.map(mapTask);
  },

  async updateTaskStatus(id: string, status: TaskStatus) {
    const prisma = getPrismaClient();
    const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
    if (!existing) return null;

    const task = await prisma.task.update({
      where: { id },
      data: { status },
    });

    await createAuditLog(workspaceId, {
      actor: "admin",
      action: `TASK_${status}`,
      entityType: "Task",
      entityId: id,
    });

    return mapTask(task);
  },

  async listRepos() {
    const prisma = getPrismaClient();
    const repos = await prisma.repoAccess.findMany({
      where: { workspaceId },
      orderBy: { repo: "asc" },
    });
    return repos.map(mapRepo);
  },

  async updateRepos(repos: RepoAccess[]) {
    const prisma = getPrismaClient();
    // TODO: Replace full reset with targeted upserts once repo lifecycle is defined.
    await prisma.$transaction([
      prisma.repoAccess.deleteMany({ where: { workspaceId } }),
      prisma.repoAccess.createMany({ data: repos.map((repo) => ({
        id: repo.id,
        workspaceId,
        repo: repo.repo,
        projectTag: repo.projectTag,
        enabled: repo.enabled,
        triggerPosts: repo.triggerPosts,
        triggerSchedules: repo.triggerSchedules,
        triggerTasks: repo.triggerTasks,
      })) }),
    ]);

    await createAuditLog(workspaceId, {
      actor: "admin",
      action: "SETTINGS_REPOS_UPDATED",
      entityType: "RepoAccess",
      entityId: "repo-allowlist",
      metadata: { count: repos.length },
    });

    return repos;
  },

  async listAuditLogs(limit: number) {
    const prisma = getPrismaClient();
    const logs = await prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return logs.map(mapAudit);
  },
});
