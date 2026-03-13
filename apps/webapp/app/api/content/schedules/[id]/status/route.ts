import { NextResponse } from "next/server";
import { updateContentScheduleStatus } from "@/lib/content/service";
import { requireApiContext } from "@/lib/auth/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireApiContext("SCHEDULING");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await request.json();
    const status = typeof body?.status === "string" ? body.status : "";

    if (!id) {
      return NextResponse.json({ error: "Schedule id is required." }, { status: 400 });
    }
    if (!["NEEDS_REVIEW", "APPROVED", "REVISION_REQUESTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const result = await updateContentScheduleStatus(
      auth.context.workspaceId,
      id,
      status as never,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true, proposal: result.proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schedule status update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
