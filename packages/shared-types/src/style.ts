export type StylePreset = {
  id: string;
  name: string;
  description: string;
  constraints: {
    tone: string;
    length: string;
    structure: string;
    doList: string[];
    dontList: string[];
  };
};

export const stylePresets: StylePreset[] = [
  {
    id: "neutral-brief",
    name: "Neutral Brief",
    description: "Clear, low-hype, and safe for internal review.",
    constraints: {
      tone: "Direct, technical, low-hype.",
      length: "Short and scannable.",
      structure: "Simple sections or bullets.",
      doList: ["Use concrete facts", "Be reviewable", "Keep claims bounded"],
      dontList: ["No launch language", "No unverifiable claims"],
    },
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "Concise framing with outcomes and implications.",
    constraints: {
      tone: "Pragmatic, outcome-focused.",
      length: "Very concise.",
      structure: "Summary + 2–4 bullets.",
      doList: ["Lead with impact", "State constraints"],
      dontList: ["No fluff", "No speculation"],
    },
  },
  {
    id: "deep-dive",
    name: "Deep Dive",
    description: "More detail and reasoning, still readable.",
    constraints: {
      tone: "Technical, explanatory.",
      length: "Medium length.",
      structure: "Sections with short paragraphs.",
      doList: ["Explain why", "Include an example if possible"],
      dontList: ["No jargon overload", "No ungrounded claims"],
    },
  },
  {
    id: "playbook",
    name: "Playbook",
    description: "Structured steps and guardrails for reuse.",
    constraints: {
      tone: "Operational and precise.",
      length: "Medium length.",
      structure: "Steps + guardrails + takeaway.",
      doList: ["Use numbered steps", "Call out guardrails"],
      dontList: ["No marketing language", "No vague advice"],
    },
  },
];

export const getStylePreset = (id?: string) =>
  stylePresets.find((preset) => preset.id === id) ?? stylePresets[0];
