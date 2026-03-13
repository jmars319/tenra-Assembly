"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BriefDetailActions({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setError(null);
    const confirmDelete = window.confirm("Delete this brief? This cannot be undone.");
    if (!confirmDelete) return;
    const res = await fetch(`/api/briefs/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "Failed to delete brief.");
      return;
    }
    router.push("/briefs");
  };

  return (
    <div className="space-y-2">
      <button
        onClick={remove}
        className="rounded-full border border-rose-500/40 px-4 py-2 text-xs text-rose-200"
      >
        Delete brief
      </button>
      {error ? <div className="text-xs text-rose-300">{error}</div> : null}
    </div>
  );
}
