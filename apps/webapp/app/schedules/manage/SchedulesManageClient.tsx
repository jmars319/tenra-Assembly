"use client";

import { useState } from "react";
import type { Post, ScheduleProposal } from "@/lib/store/types";

type Props = {
  posts: Post[];
  schedules: ScheduleProposal[];
};

export default function SchedulesManageClient({ posts, schedules }: Props) {
  const [items, setItems] = useState<ScheduleProposal[]>(schedules);
  const [postId, setPostId] = useState(posts[0]?.id ?? "");
  const [channel, setChannel] = useState("LinkedIn");
  const [scheduledFor, setScheduledFor] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setState("saving");
    setError(null);
    if (!postId) {
      setState("error");
      setError("Select a post.");
      return;
    }
    if (!scheduledFor) {
      setState("error");
      setError("Scheduled date is required.");
      return;
    }

    const res = await fetch("/api/schedules/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        channel,
        scheduledFor,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setState("error");
      setError(payload.error ?? "Failed to create schedule.");
      return;
    }

    const created = (await res.json()) as ScheduleProposal;
    setItems((prev) => [created, ...prev]);
    setScheduledFor("");
    setState("idle");
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">Create schedule</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-slate-400">
            Post
            <select
              value={postId}
              onChange={(event) => setPostId(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            >
              {posts.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.title} ({post.platform})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-slate-400">
            Scheduled for
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-slate-400">
            Channel
            <input
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="LinkedIn"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={submit}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            {state === "saving" ? "Saving..." : "Create schedule"}
          </button>
          {error ? <div className="text-xs text-rose-300">{error}</div> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">Schedule proposals</div>
        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <div className="text-sm text-slate-500">No schedules yet.</div>
          ) : (
            items.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200"
              >
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Status: {schedule.status}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {schedule.items.length} items
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
