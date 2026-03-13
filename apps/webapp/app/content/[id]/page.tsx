import PageShell from "@/app/components/PageShell";
import ContentStatusActions from "@/app/content/ContentStatusActions";
import ContentAssistPanel from "@/app/content/ContentAssistPanel";
import { getContentItem } from "@/lib/content/service";
import { getRequirements } from "@/lib/content/requirementsCopy";
import CopyButton from "@/app/components/CopyButton";
import ContentEditor from "@/app/content/ContentEditor";
import ContentSchedulePanel from "@/app/content/ContentSchedulePanel";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const { id } = await params;
  const isDb = process.env.STORAGE_MODE === "db";
  const enabled = user.isAdmin || features.CONTENT_OPS;

  if (!enabled) {
    return (
      <PageShell
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
        title="Content detail"
        subtitle="Content Ops is disabled for this workspace."
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Ask a workspace owner to enable Content Ops in Settings.
        </div>
      </PageShell>
    );
  }

  if (!isDb) {
    return (
      <PageShell
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
        title="Content detail"
        subtitle="Content Ops requires DB mode."
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Set `STORAGE_MODE=db` and `DATABASE_URL`.
        </div>
      </PageShell>
    );
  }

  const item = await getContentItem(workspace.id, id);
  if (!item) {
    return (
      <PageShell
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
        title="Content detail"
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Content item not found.
        </div>
      </PageShell>
    );
  }

  const aiMeta =
    item.aiMeta && typeof item.aiMeta === "object"
      ? (item.aiMeta as {
          assumptions?: string[];
          openQuestions?: string[];
          missingEvidence?: string[];
          stylePresetId?: string;
          promptVersion?: string;
        })
      : null;

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title={item.title || "Content detail"}
      subtitle={`${item.type} · ${item.status}`}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <ContentEditor
            id={item.id}
            title={item.title}
            summary={item.summary}
            body={item.body}
            rawInput={item.rawInput}
            structured={item.structured ?? undefined}
          />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            <div className="text-xs uppercase tracking-wide text-slate-500">Summary</div>
            <div className="mt-2 text-base text-slate-100">{item.summary || "—"}</div>
            <div className="mt-4 text-xs text-slate-500">
              Created {new Date(item.createdAt).toLocaleString()}
            </div>
          </div>

          {aiMeta ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
              <div className="text-xs uppercase tracking-wide text-slate-500">AI assumptions</div>
              <div className="mt-3 grid gap-3 text-sm text-slate-300">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Assumptions</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {(aiMeta.assumptions ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Open questions</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {(aiMeta.openQuestions ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Missing evidence</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {(aiMeta.missingEvidence ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {(() => {
            const requirements = getRequirements(item.type);
            return (
              <div
                id="requirements"
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300"
              >
                <div className="text-xs uppercase tracking-wide text-slate-500">Requirements</div>
                <div className="mt-2 text-sm text-slate-200">{requirements.purposeLine}</div>
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">To mark READY</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {requirements.readyRequirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs uppercase tracking-wide text-slate-500">
                    To save (DRAFT)
                  </summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {requirements.draftRequirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
                <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                  <span>{requirements.templateLabel}</span>
                  <CopyButton text={requirements.templateBody} />
                </div>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  {requirements.templateBody || "No template available."}
                </pre>
                {requirements.templateHint ? (
                  <div className="mt-2 text-xs text-slate-400">{requirements.templateHint}</div>
                ) : null}
                <div className="mt-4 text-xs text-slate-500">{requirements.footerNote}</div>
              </div>
            );
          })()}

          {item.body ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-200 whitespace-pre-wrap">
              <div className="text-xs uppercase tracking-wide text-slate-500">Body</div>
              <div className="mt-3">{item.body}</div>
            </div>
          ) : null}

          {item.rawInput ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-200 whitespace-pre-wrap">
              <div className="text-xs uppercase tracking-wide text-slate-500">Raw input</div>
              <div className="mt-3">{item.rawInput}</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Structured</div>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300">
              {JSON.stringify(item.structured ?? {}, null, 2)}
            </pre>
          </div>

          {item.attachments.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">Attachments</div>
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                {item.attachments.map((attachment) => (
                  <div key={attachment.id} className="rounded-lg border border-slate-800 px-3 py-2">
                    <div>{attachment.fileName}</div>
                    <div className="text-slate-500">{attachment.mimeType}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <ContentStatusActions id={item.id} />
          <ContentAssistPanel id={item.id} />
          <ContentSchedulePanel
            contentItemId={item.id}
            status={item.status}
            proposals={item.scheduleProposals ?? []}
          />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            Related slugs: {item.relatedSlugs.length ? item.relatedSlugs.join(", ") : "—"}
            <br />
            Topics: {item.topics.length ? item.topics.join(", ") : "—"}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
