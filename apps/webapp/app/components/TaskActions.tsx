"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CopyButton from "./CopyButton";

export default function TaskActions({
  taskId,
  copyText,
}: {
  taskId: string;
  copyText: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");

  const updateTask = async (action: "done" | "skip") => {
    const res = await fetch(`/api/tasks/${taskId}/${action}`, {
      method: "POST",
    });
    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      setState("error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <CopyButton text={copyText} />
      <button
        onClick={() => updateTask("done")}
        className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900"
      >
        Done
      </button>
      <button
        onClick={() => updateTask("skip")}
        className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
      >
        Skip
      </button>
      {state === "saved" ? <span className="text-xs text-emerald-300">Saved.</span> : null}
      {state === "error" ? <span className="text-xs text-rose-300">Failed.</span> : null}
    </div>
  );
}
