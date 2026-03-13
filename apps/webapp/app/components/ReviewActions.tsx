"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewActionsProps = {
  id: string;
  kind: "posts" | "schedules";
};

type ActionState = "idle" | "saving" | "saved" | "error";

export default function ReviewActions({ id, kind }: ReviewActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState>("idle");

  const runAction = async (action: "approve" | "revise" | "reject") => {
    setState("saving");
    const res = await fetch(`/api/${kind}/${id}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: action === "approve" ? undefined : JSON.stringify({ note }),
    });

    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      setState("error");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-3 text-sm font-semibold text-slate-200">Review actions</div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add a note (for revision or rejection)"
        className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 placeholder:text-slate-600"
        rows={3}
      />
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runAction("approve")}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
        >
          Approve
        </button>
        <button
          onClick={() => runAction("revise")}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300"
        >
          Request revision
        </button>
        <button
          onClick={() => runAction("reject")}
          className="rounded-lg border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
        >
          Reject
        </button>
        {state === "saved" ? <span className="text-sm text-emerald-300">Saved.</span> : null}
        {state === "error" ? <span className="text-sm text-rose-300">Failed.</span> : null}
      </div>
    </div>
  );
}
