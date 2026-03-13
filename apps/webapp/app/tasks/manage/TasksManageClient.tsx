"use client";

import { useEffect, useState } from "react";
import type { Project, Task } from "@/lib/store/types";

type Props = {
  tasks: Task[];
  projects: Project[];
};

export default function TasksManageClient({ tasks, projects }: Props) {
  const [items, setItems] = useState<Task[]>(tasks);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [copyText, setCopyText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/ai/status");
        const data = await res.json();
        setAiConfigured(Boolean(data?.configured));
      } catch {
        setAiConfigured(false);
      }
    };
    void loadStatus();
  }, []);

  const submit = async () => {
    setState("saving");
    setError(null);
    if (!projectId) {
      setState("error");
      setError("Select a project.");
      return;
    }
    if (!title.trim()) {
      setState("error");
      setError("Task title is required.");
      return;
    }
    if (!dueAt) {
      setState("error");
      setError("Due date is required.");
      return;
    }

    const res = await fetch("/api/tasks/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        title: title.trim(),
        dueAt,
        copyText: copyText.trim(),
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setState("error");
      setError(payload.error ?? "Failed to create task.");
      return;
    }

    const created = (await res.json()) as Task;
    setItems((prev) => [created, ...prev]);
    setTitle("");
    setDueAt("");
    setCopyText("");
    setState("idle");
  };

  const suggestTask = async () => {
    setAiError(null);
    if (!aiPrompt.trim()) {
      setAiError("Enter a task prompt.");
      return;
    }
    if (!aiConfigured) {
      setAiError("AI Assist is not configured.");
      return;
    }

    setAiLoading(true);
    const res = await fetch("/api/ai/tasks/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: aiPrompt.trim(),
        projectId,
      }),
    });

    const payload = await res.json();
    if (!res.ok || !payload.ok) {
      setAiError(payload.error ?? "AI task suggestion failed.");
      setAiLoading(false);
      return;
    }

    setTitle(payload.suggestion?.title ?? "");
    setCopyText(payload.suggestion?.copyText ?? "");
    if (payload.suggestion?.dueAt) {
      const iso = payload.suggestion.dueAt;
      const date = new Date(iso);
      if (!Number.isNaN(date.getTime())) {
        setDueAt(date.toISOString().slice(0, 16));
      }
    }
    setAiLoading(false);
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">Create task</div>
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">AI task draft</div>
          <label className="mt-3 grid gap-2 text-xs text-slate-400">
            Prompt
            <textarea
              rows={2}
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="e.g. Prepare manual posting checklist for approved LinkedIn post."
            />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={suggestTask}
              disabled={aiLoading}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200 disabled:opacity-60"
            >
              {aiLoading ? "Working..." : "Suggest task"}
            </button>
            {aiLoading ? <div className="text-xs text-slate-500">Working...</div> : null}
            {aiError ? <div className="text-xs text-rose-300">{aiError}</div> : null}
            {aiConfigured === false ? (
              <div className="text-xs text-slate-500">AI Assist is not configured.</div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-slate-400">
            Project
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-slate-400">
            Due at
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-slate-400">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Manual post required"
            />
          </label>
          <label className="grid gap-2 text-xs text-slate-400">
            Copy text
            <textarea
              rows={3}
              value={copyText}
              onChange={(event) => setCopyText(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Optional instructions for the task."
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={submit}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            {state === "saving" ? "Saving..." : "Create task"}
          </button>
          {error ? <div className="text-xs text-rose-300">{error}</div> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">All tasks</div>
        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <div className="text-sm text-slate-500">No tasks yet.</div>
          ) : (
            items.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200"
              >
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Project: {projects.find((p) => p.id === task.projectId)?.name ?? "Unknown"}
                </div>
                <div className="mt-1 text-sm text-slate-100">{task.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Due: {new Date(task.dueAt).toLocaleString()}
                </div>
                {task.copyText ? (
                  <div className="mt-2 text-xs text-slate-400">{task.copyText}</div>
                ) : null}
                <div className="mt-2 text-xs text-slate-500">Status: {task.status}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
