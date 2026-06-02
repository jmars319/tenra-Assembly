import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { contentTypes, type ContentType, type ValidationIssue } from "@assembly/shared-types/content";
import { getStylePreset, stylePresets } from "@assembly/shared-types/style";
import { loadDesktopShellStatus, type DesktopShellStatus } from "./lib/commands";
import { readDesktopStore, readLegacyLocalStorage, writeDesktopStore } from "./lib/desktopStore";
import {
  createId,
  formatShortDate,
  handoffTemplates,
  loadItems,
  newItem,
  nowIso,
  parseWorkbenchImport,
  promotionIssuesForItem,
  statusLabels,
  storageKey,
  templates,
  todayForFilename,
  typeLabels,
  toMarkdown,
  type AssemblyItem,
  type HandoffKind,
  type SidebarFilter,
  type WorkbenchExport
} from "./App.workbench";
import "./App.css";

function App() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AssemblyItem[]>(loadItems);
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [filter, setFilter] = useState<SidebarFilter>("active");
  const [shellStatus, setShellStatus] = useState<DesktopShellStatus | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [notice, setNotice] = useState("Local desktop workbench ready.");
  const [isStoreReady, setIsStoreReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    readDesktopStore<AssemblyItem[]>(storageKey)
      .then((storedItems) => {
        if (cancelled) return;

        const legacyItems = readLegacyLocalStorage<AssemblyItem[]>(storageKey);
        const nextItems =
          Array.isArray(storedItems) && storedItems.length > 0
            ? storedItems
            : Array.isArray(legacyItems) && legacyItems.length > 0
              ? legacyItems
              : null;

        if (nextItems) {
          setItems(nextItems);
          setActiveId(nextItems[0]?.id ?? "");
          setNotice(storedItems ? "Desktop store loaded." : "Legacy workbench records migrated.");
        }

        setIsStoreReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice(error instanceof Error ? error.message : "Desktop store unavailable.");
        setIsStoreReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isStoreReady) return;

    void writeDesktopStore(storageKey, items).catch((error: unknown) => {
      setNotice(error instanceof Error ? error.message : "Desktop store write failed.");
    });
  }, [isStoreReady, items]);

  useEffect(() => {
    let cancelled = false;

    loadDesktopShellStatus()
      .then((nextStatus) => {
        if (!cancelled) setShellStatus(nextStatus);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setShellError(error instanceof Error ? error.message : "Tauri command failed.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeItem = items.find((item) => item.id === activeId) ?? items[0] ?? newItem();
  const activeIssues = useMemo(() => promotionIssuesForItem(activeItem), [activeItem]);
  const canPromote = activeIssues.length === 0;
  const activePreset = getStylePreset(activeItem.styleId);
  const markdown = useMemo(() => toMarkdown(activeItem), [activeItem]);
  const counts = useMemo(
    () => ({
      draft: items.filter((item) => item.status === "DRAFT").length,
      ready: items.filter((item) => item.status === "READY").length,
      approved: items.filter((item) => item.status === "APPROVED").length,
    }),
    [items],
  );

  const visibleItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "approved") return item.status === "APPROVED";
    return item.status !== "ARCHIVED";
  });

  const updateActiveItem = (updates: Partial<AssemblyItem>) => {
    const updatedAt = nowIso();
    setItems((current) =>
      current.map((item) =>
        item.id === activeItem.id
          ? {
              ...item,
              ...updates,
              updatedAt,
            }
          : item,
      ),
    );
  };

  const createItem = () => {
    const item = newItem();
    setItems((current) => [item, ...current]);
    setActiveId(item.id);
    setNotice("New draft created.");
  };

  const createHandoffItem = (kind: HandoffKind) => {
    const template = handoffTemplates[kind];
    const now = nowIso();
    const item: AssemblyItem = {
      id: createId(),
      title: template.title,
      type: template.type,
      styleId: stylePresets[0]?.id ?? "neutral-brief",
      source: template.source,
      rawInput: template.rawInput,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    };

    setItems((current) => [item, ...current]);
    setActiveId(item.id);
    setNotice(`${template.label} draft created.`);
  };

  const applyTemplate = () => {
    updateActiveItem({ rawInput: templates[activeItem.type], status: "DRAFT" });
    setNotice(`${typeLabels[activeItem.type]} template applied.`);
  };

  const markReady = () => {
    if (!canPromote) {
      setNotice("Fix the review issues before marking this ready.");
      return;
    }
    updateActiveItem({ status: "READY" });
    setNotice("Item marked ready for approval.");
  };

  const approveItem = () => {
    if (!canPromote) {
      setNotice("Fix the review issues before approving this item.");
      return;
    }
    updateActiveItem({ status: "APPROVED", approvedAt: nowIso() });
    setNotice("Item approved.");
  };

  const rejectItem = () => {
    updateActiveItem({ status: "REJECTED" });
    setNotice("Item moved to rejected.");
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setNotice("Markdown copied.");
    } catch {
      setNotice("Clipboard copy failed. Export still works.");
    }
  };

  const exportMarkdown = () => {
    const slug = (activeItem.title || "assembly-item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug || "assembly-item"}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Markdown export created.");
  };

  const exportWorkbench = () => {
    const payload: WorkbenchExport = {
      exportedAt: nowIso(),
      items,
      schema: "tenra-assembly-desktop-workbench:v1",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `tenra-assembly-workbench-${todayForFilename()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Workbench export created.");
  };

  const importWorkbench = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const nextItems = parseWorkbenchImport(JSON.parse(await file.text()));
      setItems(nextItems);
      setActiveId(nextItems[0]?.id ?? "");
      setNotice(`Imported ${nextItems.length} workbench item(s).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Workbench import failed.");
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <header className="brandBlock">
          <span className="brandTag">Assembly by Tenra</span>
          <h1>Content workbench</h1>
          <p>Local drafts, review gates, approval state, and export.</p>
        </header>

        <div className="summaryGrid" aria-label="Content counts">
          <div>
            <strong>{counts.draft}</strong>
            <span>Draft</span>
          </div>
          <div>
            <strong>{counts.ready}</strong>
            <span>Ready</span>
          </div>
          <div>
            <strong>{counts.approved}</strong>
            <span>Approved</span>
          </div>
        </div>

        <div className="toolbar">
          <button type="button" onClick={createItem}>
            New
          </button>
          <button type="button" onClick={exportWorkbench}>
            Export Data
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()}>
            Import Data
          </button>
          <select value={filter} onChange={(event) => setFilter(event.target.value as SidebarFilter)}>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="all">All</option>
          </select>
          <input
            ref={importInputRef}
            className="hiddenFileInput"
            type="file"
            accept="application/json"
            onChange={importWorkbench}
          />
        </div>

        <section className="handoffPanel" aria-label="Suite handoff starters">
          <span className="brandTag">Suite handoffs</span>
          <div className="handoffList">
            {(Object.keys(handoffTemplates) as HandoffKind[]).map((kind) => (
              <button key={kind} type="button" onClick={() => createHandoffItem(kind)}>
                {handoffTemplates[kind].label}
              </button>
            ))}
          </div>
        </section>

        <nav className="itemList" aria-label="Assembly items">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              className={item.id === activeItem.id ? "itemButton itemButtonActive" : "itemButton"}
              onClick={() => setActiveId(item.id)}
              type="button"
            >
              <span>{item.title || "Untitled"}</span>
              <small>
                {typeLabels[item.type]} / {statusLabels[item.status]}
              </small>
            </button>
          ))}
        </nav>

        <footer className="runtimeNote">
          <strong>{shellStatus?.productName ?? "Assembly by Tenra"}</strong>
          <span>{shellError ?? shellStatus?.mode ?? "desktop"}</span>
        </footer>
      </aside>

      <main className="mainPanel">
        <section className="editorPanel" aria-label="Content editor">
          <header className="sectionHeader">
            <div>
              <span className="eyebrow">Draft</span>
              <h2>{activeItem.title || "Untitled"}</h2>
            </div>
            <span className={`statusPill status${activeItem.status}`}>{statusLabels[activeItem.status]}</span>
          </header>

          <div className="formGrid">
            <label>
              Title
              <input
                value={activeItem.title}
                onChange={(event) => updateActiveItem({ title: event.target.value })}
                placeholder="Working title"
              />
            </label>

            <label>
              Type
              <select
                value={activeItem.type}
                onChange={(event) => {
                  const nextType = event.target.value as ContentType;
                  updateActiveItem({
                    type: nextType,
                    rawInput: templates[nextType],
                    status: "DRAFT",
                  });
                }}
              >
                {contentTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Style
              <select value={activeItem.styleId} onChange={(event) => updateActiveItem({ styleId: event.target.value })}>
                {stylePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Source or context
              <input
                value={activeItem.source}
                onChange={(event) => updateActiveItem({ source: event.target.value })}
                placeholder="Manual entry, repo note, meeting, Scout lead"
              />
            </label>
          </div>

          <label className="draftLabel">
            Draft body
            <textarea value={activeItem.rawInput} onChange={(event) => updateActiveItem({ rawInput: event.target.value })} />
          </label>

          <div className="actionBar" aria-label="Review actions">
            <button type="button" onClick={applyTemplate}>
              Template
            </button>
            <button type="button" onClick={markReady}>
              Mark Ready
            </button>
            <button type="button" onClick={approveItem}>
              Approve
            </button>
            <button type="button" onClick={rejectItem}>
              Reject
            </button>
            <button type="button" onClick={copyMarkdown}>
              Copy Markdown
            </button>
            <button type="button" onClick={exportMarkdown}>
              Export
            </button>
          </div>

          <p className="notice" role="status">
            {notice}
          </p>
        </section>

        <aside className="reviewPanel" aria-label="Review panel">
          <section>
            <header className="panelHeader">
              <span>Review Gate</span>
              <strong>{canPromote ? "Pass" : `${activeIssues.length} issue(s)`}</strong>
            </header>
            {activeIssues.length > 0 ? (
              <ul className="issueList">
                {activeIssues.map((issue: ValidationIssue) => (
                  <li key={issue.code}>
                    <strong>{issue.message}</strong>
                    {issue.hint ? <span>{issue.hint}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panelCopy">This item meets the promotion requirements for its content type.</p>
            )}
          </section>

          <section>
            <header className="panelHeader">
              <span>Style</span>
              <strong>{activePreset.name}</strong>
            </header>
            <p className="panelCopy">{activePreset.description}</p>
            <dl className="detailList">
              <dt>Tone</dt>
              <dd>{activePreset.constraints.tone}</dd>
              <dt>Length</dt>
              <dd>{activePreset.constraints.length}</dd>
              <dt>Structure</dt>
              <dd>{activePreset.constraints.structure}</dd>
            </dl>
          </section>

          <section>
            <header className="panelHeader">
              <span>Export Preview</span>
              <strong>{formatShortDate(activeItem.updatedAt)}</strong>
            </header>
            <pre className="markdownPreview">{markdown}</pre>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
