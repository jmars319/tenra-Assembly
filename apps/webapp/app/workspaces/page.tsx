import { cookies } from "next/headers";
import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import WorkspacesClient from "@/app/workspaces/WorkspacesClient";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guard";
import { LEGACY_WORKSPACE_COOKIE, WORKSPACE_COOKIE } from "@/lib/auth/session";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "MEMBER" | "ADMIN";
  active: boolean;
};

export default async function WorkspacesPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <PageShell title="Workspaces" subtitle="Sign in to continue.">
        <PurposeCard>Session required.</PurposeCard>
      </PageShell>
    );
  }

  const prisma = getPrismaClient();
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value ?? cookieStore.get(LEGACY_WORKSPACE_COOKIE)?.value ?? "";

  let workspaces: WorkspaceRow[] = [];

  if (session.user.isAdmin) {
    const allWorkspaces = await prisma.workspace.findMany({ orderBy: { createdAt: "asc" } });
    workspaces = allWorkspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: "ADMIN",
      active: workspace.id === activeWorkspaceId,
    }));
  } else {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id, active: true },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    workspaces = memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      active: membership.workspace.id === activeWorkspaceId,
    }));
  }

  const activeMembership = session.user.isAdmin
    ? null
    : await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id, workspaceId: activeWorkspaceId, active: true },
      });

  const canInvite = session.user.isAdmin || activeMembership?.role === "OWNER";

  return (
    <PageShell title="Workspaces" subtitle="Switch or manage your workspace.">
      <section className="grid gap-6">
        <PurposeCard>Workspaces control access and data boundaries.</PurposeCard>
        <WorkspacesClient
          workspaces={workspaces}
          canInvite={canInvite}
          canCreate={session.user.isAdmin}
          activeWorkspaceId={activeWorkspaceId}
        />
      </section>
    </PageShell>
  );
}
