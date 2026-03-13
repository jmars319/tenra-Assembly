import { NextResponse } from "next/server";
import { getContentItem, createContentScheduleProposal } from "@/lib/content/service";
import type { ContentType } from "@/lib/content/types";
import { requireApiContext } from "@/lib/auth/api";

const channelByType: Record<ContentType, string> = {
  FIELD_NOTE: "Website",
  PROJECT_NOTE: "Case Study",
  SYSTEMS_MEMO: "Website",
  BLOG_FEATURE: "Website",
  CHANGE_LOG: "Website",
  DECISION_RECORD: "Internal",
  SIGNAL_LOG: "Internal",
};

const suggestDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(10, 0, 0, 0);
  return date;
};

export async function POST(request: Request) {
  try {
    const auth = await requireApiContext("AI_SCHEDULER");
    if (!auth.ok) return auth.response;
    const body = await request.json();
    const contentItemId = typeof body?.contentItemId === "string" ? body.contentItemId : "";
    if (!contentItemId) {
      return NextResponse.json({ error: "contentItemId is required." }, { status: 400 });
    }

    const item = await getContentItem(auth.context.workspaceId, contentItemId);
    if (!item) {
      return NextResponse.json({ error: "Content item not found." }, { status: 404 });
    }

    const channel = channelByType[item.type];
    const scheduledFor = suggestDate();
    const rationale = `Suggested based on ${item.type} cadence (${item.cadenceTarget ?? "ad hoc"}).`;
    const assumptions = `Channel assumes standard placement for ${item.type}.`;

    const result = await createContentScheduleProposal({
      workspaceId: auth.context.workspaceId,
      contentItemId,
      channel,
      scheduledFor,
      rationale,
      assumptions,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, proposal: result.proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schedule proposal failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
