export type PostStatus = "NEEDS_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";
export type ScheduleStatus = "NEEDS_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";
export type TaskStatus = "PENDING" | "DONE" | "SKIPPED";

export type Project = {
  id: string;
  name: string;
  tag: string;
};

export type RepoAccess = {
  id: string;
  repo: string;
  projectTag: string;
  enabled: boolean;
  triggerPosts: boolean;
  triggerSchedules: boolean;
  triggerTasks: boolean;
};

export type Brief = {
  id: string;
  projectId: string;
  evidenceBundleId?: string | null;
  sourceRepoId?: string | null;
  summary: string;
  createdAt: string;
};

export type Post = {
  id: string;
  projectId: string;
  platform: string;
  title: string;
  status: PostStatus;
  postJson: Record<string, unknown>;
  claims: string[];
  createdAt: string;
  updatedAt: string;
};

export type ScheduleItem = {
  id: string;
  postId: string;
  channel: string;
  scheduledFor: string;
};

export type ScheduleProposal = {
  id: string;
  projectId: string;
  status: ScheduleStatus;
  items: ScheduleItem[];
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  dueAt: string;
  copyText: string;
};

export type AuditLog = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

export type DashboardSummary = {
  counts: {
    postsReady: number;
    schedulesReady: number;
    tasksDue: number;
  };
  recentAudit: AuditLog[];
};

export type InboxSummary = {
  posts: Post[];
  schedules: ScheduleProposal[];
};

export type StorageAdapter = {
  getDashboard(): Promise<DashboardSummary>;
  listInbox(): Promise<InboxSummary>;
  listProjects(): Promise<Project[]>;
  listBriefs(): Promise<Brief[]>;
  getBrief(id: string): Promise<Brief | null>;
  listPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  updatePostStatus(id: string, status: PostStatus, note?: string): Promise<Post | null>;
  listSchedules(): Promise<ScheduleProposal[]>;
  getSchedule(id: string): Promise<ScheduleProposal | null>;
  updateScheduleStatus(id: string, status: ScheduleStatus, note?: string): Promise<ScheduleProposal | null>;
  listTasks(): Promise<Task[]>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task | null>;
  listRepos(): Promise<RepoAccess[]>;
  updateRepos(repos: RepoAccess[]): Promise<RepoAccess[]>;
  listAuditLogs(limit: number): Promise<AuditLog[]>;
};
