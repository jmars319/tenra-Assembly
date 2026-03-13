import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import { getStore } from "@/lib/store";
import type { Post, ScheduleProposal } from "@/lib/store/types";
import { requireWorkspaceContext } from "@/lib/workspace/context";

const withParams = (href: string, params: Record<string, string | undefined>) => {
  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) nextParams.set(key, value);
  });
  const query = nextParams.toString();
  return query ? `${href}?${query}` : href;
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const params = await searchParams;
  const store = getStore(workspace.id);
  const data = await store.listInbox();
  const typeFilter = params?.type ?? "all";
  const posts = typeFilter === "schedules" ? [] : data.posts;
  const schedules = typeFilter === "posts" ? [] : data.schedules;
  const archiveLink = withParams("/inbox/archive", {
    type: typeFilter === "all" ? undefined : typeFilter,
  });
  const newPostLink = "/posts/new";
  const manageSchedulesLink = "/schedules/manage";
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-slate-500 bg-slate-800 text-white" : "border-slate-800 text-slate-300"}`;
  const makeFilterLink = (value: string) =>
    withParams("/inbox", { type: value === "all" ? undefined : value });

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Inbox"
      subtitle="Review queue for posts and schedule proposals."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={newPostLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            Generate post
          </Link>
          <Link
            href={manageSchedulesLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            Create schedule
          </Link>
          <Link
            href={archiveLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            View archive
          </Link>
        </div>
      }
    >
      <PurposeCard>
        This is the review gate. Approve, request revisions, or reject before anything moves forward.
      </PurposeCard>
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
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm font-semibold text-slate-200">Posts</div>
          <div className="mt-1 text-xs text-slate-500">
            Drafted posts waiting for a human review decision.
          </div>
          <div className="mt-4 grid gap-3">
            {posts.length === 0 ? (
              <div className="text-sm text-slate-500">No posts awaiting review.</div>
            ) : (
              posts.map((post: Post) => (
                <Link
                  key={post.id}
                  href={withParams(`/posts/${post.id}`, {
                    type: typeFilter === "all" ? undefined : typeFilter,
                  })}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200 hover:border-slate-600"
                >
                  <div className="font-semibold text-slate-100">{post.title}</div>
                  <div className="text-xs text-slate-500">{post.platform}</div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm font-semibold text-slate-200">Schedules</div>
          <div className="mt-1 text-xs text-slate-500">
            Proposed timing for approved posts. Review before approving.
          </div>
          <div className="mt-4 grid gap-3">
            {schedules.length === 0 ? (
              <div className="text-sm text-slate-500">No schedules awaiting review.</div>
            ) : (
              schedules.map((schedule: ScheduleProposal) => (
                <Link
                  key={schedule.id}
                  href={withParams(`/schedules/${schedule.id}`, {
                    type: typeFilter === "all" ? undefined : typeFilter,
                  })}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200 hover:border-slate-600"
                >
                  <div className="font-semibold text-slate-100">Schedule proposal</div>
                  <div className="text-xs text-slate-500">{schedule.items.length} items</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
