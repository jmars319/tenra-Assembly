import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import { getStore } from "@/lib/store";
import { requireWorkspaceContext } from "@/lib/workspace/context";

const withParams = (href: string, params: Record<string, string | undefined>) => {
  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) nextParams.set(key, value);
  });
  const query = nextParams.toString();
  return query ? `${href}?${query}` : href;
};

export default async function PostArchivePage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const params = await searchParams;
  const store = getStore(workspace.id);
  const statusFilter = params?.status ?? "all";
  const posts = (await store.listPosts()).filter((post) => {
    if (post.status === "NEEDS_REVIEW") return false;
    if (statusFilter === "all") return true;
    return post.status === statusFilter;
  });
  const statusCounts = posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.status] = (acc[post.status] ?? 0) + 1;
    return acc;
  }, {});
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-slate-500 bg-slate-800 text-white" : "border-slate-800 text-slate-300"}`;
  const makeFilterLink = (value: string) =>
    withParams("/posts/archive", { status: value === "all" ? undefined : value });

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Post archive"
      subtitle="Posts that have moved past review."
      actions={
        <Link
          href={withParams("/inbox", {
            status: statusFilter === "all" ? undefined : statusFilter,
          })}
          className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
        >
          Back to inbox
        </Link>
      }
    >
      <PurposeCard>
        Browse posts that are already approved, rejected, or awaiting revision follow-ups.
      </PurposeCard>
      <section className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "all" },
          { label: "Approved", value: "APPROVED" },
          { label: "Revision", value: "REVISION_REQUESTED" },
          { label: "Rejected", value: "REJECTED" },
        ].map((item) => (
          <Link key={item.value} href={makeFilterLink(item.value)} className={chipClass(statusFilter === item.value)}>
            {item.label}
          </Link>
        ))}
      </section>
      <section className="flex flex-wrap gap-3">
        {Object.entries(statusCounts).length === 0 ? (
          <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-500">
            No archived posts yet
          </span>
        ) : (
          Object.entries(statusCounts).map(([status, count]) => (
            <span
              key={status}
              className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300"
            >
              {status}: {count}
            </span>
          ))
        )}
      </section>
      <section className="grid gap-4">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-500">
            No archived posts yet.
          </div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={withParams(`/posts/${post.id}`, {
                status: statusFilter === "all" ? undefined : statusFilter,
              })}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-200 hover:border-slate-600"
            >
              <div className="font-semibold text-slate-100">{post.title}</div>
              <div className="text-xs text-slate-500">{post.platform} · {post.status}</div>
            </Link>
          ))
        )}
      </section>
    </PageShell>
  );
}
