import "server-only";
import { NextResponse } from "next/server";
import { requireFeature, requireSession, requireWorkspaceAccess } from "@/lib/auth/guard";

type ApiContext = {
  user: { id: string; email: string; isAdmin: boolean };
  workspaceId: string;
};

type ApiOk = { ok: true; context: ApiContext };
type ApiFail = { ok: false; response: NextResponse };

const featureDisabled = (feature: string) =>
  NextResponse.json(
    { error: "Feature disabled.", code: "feature_disabled", feature },
    { status: 403 },
  );

export const requireApiContext = async (feature?: string): Promise<ApiOk | ApiFail> => {
  const session = await requireSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  const access = await requireWorkspaceAccess(session);
  if (!access) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  if (feature) {
    const enabled = await requireFeature(access.workspaceId, feature);
    if (!enabled && !access.user.isAdmin) {
      return { ok: false, response: featureDisabled(feature) };
    }
  }
  return { ok: true, context: access as ApiContext };
};
