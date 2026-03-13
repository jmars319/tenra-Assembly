"use client";

import { useState } from "react";

export default function HowToUseModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
      >
        How to use
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="How to use Assembly"
            className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-200 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">How to use Assembly</div>
                <div className="mt-1 text-sm text-slate-400">
                  Human approval gates stay in place. Assembly proposes, you decide.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 text-sm">
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">1. Connect repos</div>
                <div className="mt-2 text-slate-300">
                  Install the GitHub App and select the repos Assembly can read. Repo selection is the
                  access boundary.
                </div>
              </section>
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">2. Capture evidence</div>
                <div className="mt-2 text-slate-300">
                  Capture repo evidence (commits, docs, or notes). Evidence stays read-only.
                </div>
              </section>
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">3. Create briefs</div>
                <div className="mt-2 text-slate-300">
                  Generate briefs from evidence or paste your own prompt. Briefs are reusable context
                  blocks.
                </div>
              </section>
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">4. Draft posts</div>
                <div className="mt-2 text-slate-300">
                  Create posts from briefs or content. AI drafts are editable before review.
                </div>
              </section>
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  5. Approve and schedule
                </div>
                <div className="mt-2 text-slate-300">
                  Approve drafts, then request schedule proposals. No posting happens without explicit
                  approval.
                </div>
              </section>
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  6. Track tasks and audit
                </div>
                <div className="mt-2 text-slate-300">
                  Manual tasks stay visible and every action is logged in Audit for traceability.
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
