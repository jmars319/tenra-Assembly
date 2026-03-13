export type AuditDisplay = {
  label: string;
  detail?: string;
};

const staticLabels: Record<string, string> = {
  content_create: "Content item created",
  content_update: "Content updated",
  content_status: "Content status updated",
  content_import: "Project notes imported",
  content_assist_suggested: "AI assist suggested",
  content_assist_applied: "AI assist applied",
  content_schedule_proposed: "Content schedule proposed",
  content_schedule_status: "Content schedule status updated",
  generate_post: "Post generated",
  SETTINGS_REPOS_UPDATED: "Repo selection updated",
  BRIEF_CREATED: "Brief created",
  BRIEF_DELETED: "Brief deleted",
  SCHEDULE_CREATED: "Schedule proposal created",
};

export const getAuditDisplay = (action: string): AuditDisplay => {
  if (staticLabels[action]) return { label: staticLabels[action], detail: action };

  if (action.startsWith("POST_")) {
    return { label: "Post status updated", detail: action };
  }
  if (action.startsWith("SCHEDULE_")) {
    return { label: "Schedule status updated", detail: action };
  }
  if (action.startsWith("TASK_")) {
    return { label: "Task status updated", detail: action };
  }

  return { label: action, detail: action };
};

export const getAuditLabel = (action: string) => getAuditDisplay(action).label;
