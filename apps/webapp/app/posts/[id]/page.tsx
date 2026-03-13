import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import ReviewActions from "@/app/components/ReviewActions";
import PostSchedulePanel from "@/app/posts/PostSchedulePanel";
import { getStore } from "@/lib/store";
import { notFound } from "next/navigation";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ status?: string; type?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const resolvedParams = await params;
  const queryParams = await searchParams;
  const store = getStore(workspace.id);
  const post = await store.getPost(resolvedParams.id);
  if (!post) {
    notFound();
  }
  const archiveLink = (() => {
    const nextParams = new URLSearchParams();
    if (queryParams?.status) nextParams.set("status", queryParams.status);
    return nextParams.toString() ? `/posts/archive?${nextParams.toString()}` : "/posts/archive";
  })();
  const backLink = (() => {
    const nextParams = new URLSearchParams();
    if (queryParams?.type) nextParams.set("type", queryParams.type);
    return nextParams.toString() ? `/inbox?${nextParams.toString()}` : "/inbox";
  })();
  const postText =
    typeof post.postJson?.text === "string"
      ? post.postJson.text
      : typeof post.postJson?.body === "string"
        ? post.postJson.body
        : "";

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title={post.title}
      subtitle={`Status: ${post.status}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={backLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            Back to inbox
          </Link>
          <Link
            href={archiveLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            Post archive
          </Link>
        </div>
      }
    >
      <PurposeCard>
        Review a single post in detail and approve, request revision, or reject before publishing.
      </PurposeCard>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm font-semibold text-slate-200">Post preview</div>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-100">
            {postText ? (
              <div className="whitespace-pre-wrap break-words leading-relaxed">{postText}</div>
            ) : (
              <div className="text-sm text-slate-500">No preview text available.</div>
            )}
          </div>
          <div className="mt-6 text-sm font-semibold text-slate-200">Post JSON</div>
          <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200">
            {JSON.stringify(post.postJson, null, 2)}
          </pre>
          <div className="mt-4 text-sm font-semibold text-slate-200">Claims</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
            {post.claims.map((claim: string) => (
              <li key={claim}>{claim}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <ReviewActions id={post.id} kind="posts" />
          <PostSchedulePanel postId={post.id} postStatus={post.status} />
        </div>
      </section>
    </PageShell>
  );
}
