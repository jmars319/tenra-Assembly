"use client";

import { useMemo, useState } from "react";
import type { BrandInstruction } from "@/app/components/SettingsClient";

type SaveState = "idle" | "saved" | "error";

type Props = {
  instructions: BrandInstruction[];
  onChange: (next: BrandInstruction[]) => void;
  onSave: () => void;
  onReset: () => void;
  saveState: SaveState;
  usedTags: Set<string>;
  canManage?: boolean;
};

type ModalState = {
  id: string;
  tag: string;
  tone: string;
  hardRules: string;
  doList: string;
  dontList: string;
} | null;

const normalizeTag = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export default function AIInstructions({
  instructions,
  onChange,
  onSave,
  onReset,
  saveState,
  usedTags,
  canManage = true,
}: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  const tags = useMemo(() => instructions.map((item) => item.tag), [instructions]);

  const openModal = (entry: BrandInstruction) => {
    setModal({ ...entry });
  };

  const addBrand = () => {
    const newEntry: BrandInstruction = {
      id: `brand-${Date.now()}`,
      tag: "NEW_BRAND",
      tone: "",
      hardRules: "",
      doList: "",
      dontList: "",
    };
    onChange([...instructions, newEntry]);
    setModal({ ...newEntry });
  };

  const deleteBrand = (entry: BrandInstruction) => {
    if (usedTags.has(entry.tag)) return;
    if (!confirm(`Delete ${entry.tag}?`)) return;
    onChange(instructions.filter((item) => item.id !== entry.id));
  };

  const saveModal = () => {
    if (!modal) return;
    const normalized = normalizeTag(modal.tag);
    const duplicate = instructions.some((item) => item.tag === normalized && item.id !== modal.id);
    if (duplicate || !normalized) return;

    onChange(
      instructions.map((item) =>
        item.id === modal.id
          ? {
              ...item,
              tag: normalized,
              tone: modal.tone.trim(),
              hardRules: modal.hardRules.trim(),
              doList: modal.doList.trim(),
              dontList: modal.dontList.trim(),
            }
          : item
      )
    );
    setModal(null);
  };

  const modalDuplicate = modal
    ? instructions.some((item) => item.tag === normalizeTag(modal.tag) && item.id !== modal.id)
    : false;

  const normalizedTag = modal ? normalizeTag(modal.tag) : "";
  const modalInvalidTag = modal ? normalizedTag.length === 0 : false;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-200">AI instructions</div>
          <div className="text-xs text-slate-500">
            Workspace-scoped guidance for tone and hard rules. Used by AI drafts.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addBrand}
            disabled={!canManage}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
          >
            Add brand
          </button>
          <button
            onClick={onReset}
            disabled={!canManage}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
          >
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={!canManage}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {instructions.map((entry) => (
          <div
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.tag}</div>
              <div className="text-sm text-slate-300">
                {entry.tone || "No tone guidance yet."}
              </div>
              {usedTags.has(entry.tag) ? (
                <div className="mt-2 text-xs text-slate-500">In use by repo access.</div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal(entry)}
                disabled={!canManage}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
              >
                Edit
              </button>
              <button
                onClick={() => deleteBrand(entry)}
                disabled={usedTags.has(entry.tag) || !canManage}
                className={`rounded-lg border px-3 py-1 text-xs ${
                  usedTags.has(entry.tag) || !canManage
                    ? "border-slate-800 text-slate-600"
                    : "border-slate-700 text-slate-200"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        {saveState === "saved" ? "Saved." : null}
        {saveState === "error" ? "Save failed." : null}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Edit brand</div>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-2 text-xs text-slate-400">
                Brand tag
                <input
                  value={modal.tag}
                  onChange={(event) => setModal({ ...modal, tag: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-2 text-sm text-slate-100"
                />
              </label>
              <div className="text-xs text-slate-500">
                Saved tags are normalized to A-Z, 0-9, underscores.
              </div>
              <div className="text-xs text-slate-500">
                Will save as: {normalizedTag || "—"}
              </div>
              {modalInvalidTag ? (
                <div className="text-xs text-rose-400">Brand tag is required.</div>
              ) : null}
              {modalDuplicate ? (
                <div className="text-xs text-rose-400">Brand tag must be unique.</div>
              ) : null}
              <label className="grid gap-2 text-xs text-slate-400">
                Tone
                <textarea
                  rows={2}
                  value={modal.tone}
                  onChange={(event) => setModal({ ...modal, tone: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-sm text-slate-100"
                />
              </label>
              <label className="grid gap-2 text-xs text-slate-400">
                Hard rules
                <textarea
                  rows={2}
                  value={modal.hardRules}
                  onChange={(event) => setModal({ ...modal, hardRules: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-sm text-slate-100"
                />
              </label>
              <label className="grid gap-2 text-xs text-slate-400">
                Do list
                <textarea
                  rows={2}
                  value={modal.doList}
                  onChange={(event) => setModal({ ...modal, doList: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-sm text-slate-100"
                />
              </label>
              <label className="grid gap-2 text-xs text-slate-400">
                Don&apos;t list
                <textarea
                  rows={2}
                  value={modal.dontList}
                  onChange={(event) => setModal({ ...modal, dontList: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-sm text-slate-100"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={saveModal}
                disabled={modalDuplicate || modalInvalidTag}
                className={`rounded-lg border px-3 py-1 text-xs ${
                  modalDuplicate || modalInvalidTag
                    ? "border-slate-800 text-slate-600"
                    : "border-slate-700 text-slate-200"
                }`}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tags.length === 0 ? (
        <div className="mt-4 text-xs text-slate-500">No brands configured yet.</div>
      ) : null}
    </div>
  );
}
