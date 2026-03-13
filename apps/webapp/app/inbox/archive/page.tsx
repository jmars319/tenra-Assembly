import Link from "next/link";
import PageShell from "@/app/components/PageShell";
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

export default async function InboxArchivePage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const params = await searchParams;
  const store = getStore(workspace.id);
  const typeFilter = params?.type ?? "all";
  const allPosts = (await store.listPosts()).filter((post) => post.status !== "NEEDS_REVIEW");
  const allSchedules = (await store.listSchedules()).filter(
    (schedule) => schedule.status !== "NEEDS_REVIEW"
  );
  const filteredPosts = typeFilter === "schedules" ? [] : allPosts;
  const filteredSchedules = typeFilter === "posts" ? [] : allSchedules;
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-slate-500 bg-slate-800 text-white" : "border-slate-800 text-slate-300"}`;
  const makeFilterLink = (value: string) =>
    withParams("/inbox/archive", { type: value === "all" ? undefined : value });

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Inbox archive"
      subtitle="Reviewed posts and schedules."
      actions={
        <Link
          href={withParams("/inbox", {
            type: typeFilter === "all" ? undefined : typeFilter,
          })}
          className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
        >
          Back to inbox
        </Link>
      }
    >
      <section className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "all" },
          { label: "Posts", value: "posts" },
          { label: "Schedules", value: "schedules" },
        ].map((item) => (
          <Link key={item.value} href={makeFilterLink(item.value)} className={chipClass(typeFilter === item.value)}>
            {item.label}
          </Link>
        ))}
      </section>
      <section className="flex flex-wrap gap-3">
        <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
          Posts: {filteredPosts.length}
        </span>
        <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
          Schedules: {filteredSchedules.length}
        </span>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm font-semibold text-slate-200">Posts</div>
          <div className="mt-4 grid gap-3">
            {filteredPosts.length === 0 ? (
              <div className="text-sm text-slate-500">No reviewed posts yet.</div>
            ) : (
              filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={withParams(`/posts/${post.id}`, {
                    type: typeFilter === "all" ? undefined : typeFilter,
                  })}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200 hover:border-slate-600"
                >
                  <div className="font-semibold text-slate-100">{post.title}</div>
                  <div className="text-xs text-slate-500">{post.platform} · {post.status}</div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm font-semibold text-slate-200">Schedules</div>
          <div className="mt-4 grid gap-3">
            {filteredSchedules.length === 0 ? (
              <div className="text-sm text-slate-500">No reviewed schedules yet.</div>
            ) : (
              filteredSchedules.map((schedule) => (
                <Link
                  key={schedule.id}
                  href={withParams(`/schedules/${schedule.id}`, {
                    type: typeFilter === "all" ? undefined : typeFilter,
                  })}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200 hover:border-slate-600"
                >
                  <div className="font-semibold text-slate-100">Schedule proposal</div>
                  <div className="text-xs text-slate-500">{schedule.items.length} items · {schedule.status}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
