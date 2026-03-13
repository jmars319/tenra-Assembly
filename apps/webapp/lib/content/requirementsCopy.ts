export type RequirementsCopy = {
  purposeLine: string;
  draftRequirements: string[];
  readyRequirements: string[];
  templateLabel: string;
  templateBody: string;
  templateHint?: string;
  footerNote: string;
};

const baseFooterNote =
  "If AI Assist is enabled, it can clean up formatting and suggest structure. You still approve what gets applied.";

const copyMap: Record<string, RequirementsCopy> = {
  FIELD_NOTE: {
    purposeLine: "Short monthly updates. One idea per line.",
    draftRequirements: ["Anything readable. Bullets, sentences, or a rough paragraph is fine."],
    readyRequirements: [
      "3–8 bullets (recommended)",
      "One idea per line",
      "No hype. Concrete wins, changes, or learnings.",
    ],
    templateLabel: "Template",
    templateBody: "- Shipped:\n- Improved:\n- Learned:\n- Next:",
    templateHint: "If you paste a paragraph, Assembly can split it into bullets (AI Assist, if enabled).",
    footerNote: baseFooterNote,
  },
  PROJECT_NOTE: {
    purposeLine: "Small updates that keep case studies alive.",
    draftRequirements: ["One delta is enough."],
    readyRequirements: [
      "case_study_slug",
      "date (YYYY-MM-DD)",
      "detail (what changed, what it means)",
      "metric and source_link optional but encouraged.",
    ],
    templateLabel: "Template (single item)",
    templateBody:
      '{\n  "case_study_slug": "mmh",\n  "date": "2026-01-15",\n  "metric": "Performance",\n  "detail": "Reduced seating modal load time by ~40% by deferring map assets until after first interaction.",\n  "source_link": ""\n}',
    footerNote: baseFooterNote,
  },
  SYSTEMS_MEMO: {
    purposeLine: "One thesis, a few points, one example, one takeaway.",
    draftRequirements: ["A thesis OR ~200 characters total."],
    readyRequirements: [
      "Thesis",
      "3–5 supporting points",
      "A takeaway",
      "Example optional but recommended.",
    ],
    templateLabel: "Template (Markdown)",
    templateBody:
      "## Thesis\n[One clear claim.]\n\n## Points\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\n## Example\n[Real or anonymized example.]\n\n## Takeaway\n[What the reader should do or notice next.]",
    footerNote: baseFooterNote,
  },
  BLOG_FEATURE: {
    purposeLine: "SEO depth + internal links. Editorial tone, proof-based.",
    draftRequirements: ["Title OR body. Either is fine."],
    readyRequirements: ["Title", "primary_keyword", "Body ≥ 300 characters", "Optional: internal links to include."],
    templateLabel: "Template (Markdown + frontmatter)",
    templateBody:
      "---\ntitle: \"\"\nprimary_keyword: \"\"\ndescription: \"\"\ntags: []\ninternal_links:\n  - /work\n  - /process\n---\n\n## Outline\n- [Section]\n- [Section]\n- [Section]\n\n## Draft\n[Write here.]",
    footerNote: baseFooterNote,
  },
  CHANGE_LOG: {
    purposeLine: "Track meaningful changes without turning every commit into content.",
    draftRequirements: ["Any note."],
    readyRequirements: ["Date", "What changed", "Why it matters", "Impact (optional)"],
    templateLabel: "Template",
    templateBody: "- Date: 2026-01-15\n- Change:\n- Why:\n- Impact:",
    footerNote: baseFooterNote,
  },
  DECISION_RECORD: {
    purposeLine: "Captures reasoning so future you don’t re-litigate decisions.",
    draftRequirements: ["A decision statement is enough."],
    readyRequirements: ["Decision", "Context", "Options considered", "Rationale", "Consequences/tradeoffs"],
    templateLabel: "Template",
    templateBody:
      "## Decision\n[What we decided.]\n\n## Context\n[What problem we were solving.]\n\n## Options\n- A:\n- B:\n- C:\n\n## Rationale\n[Why this option.]\n\n## Tradeoffs\n- Pros:\n- Cons:",
    footerNote: baseFooterNote,
  },
  SIGNAL_LOG: {
    purposeLine: "Lightweight “this seems to be true lately” notes.",
    draftRequirements: ["One observation."],
    readyRequirements: ["Signal statement", "Evidence bullets (even if informal)", "Next action (what you’ll do with it)"],
    templateLabel: "Template",
    templateBody:
      "## Signal\n[Observation.]\n\n## Evidence\n- \n- \n\n## Next action\n[What we’ll try or monitor.]",
    footerNote: baseFooterNote,
  },
};

export const getRequirements = (type: string): RequirementsCopy =>
  copyMap[type] ?? {
    purposeLine: "Provide enough context to move forward.",
    draftRequirements: ["Any readable input."],
    readyRequirements: ["Clean structure and required fields."],
    templateLabel: "Template",
    templateBody: "",
    footerNote: baseFooterNote,
  };
