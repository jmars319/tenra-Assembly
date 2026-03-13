export const GLOBAL_HARD_RULES = ["NO EM-DASHES EVER."] as const;

export type InstructionContext = {
  org?: {
    tag?: string;
    tone?: string;
    hardRules?: string;
    doList?: string;
    dontList?: string;
  };
  user?: {
    tone?: string;
    notes?: string;
  };
  style?: {
    id?: string;
    name?: string;
    description?: string;
    constraints?: {
      tone?: string;
      length?: string;
      structure?: string;
      doList?: string[];
      dontList?: string[];
    };
  };
  context?: string[];
};

const formatList = (value?: string | string[]) => {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.length ? value.join("; ") : "";
  }
  return value.trim();
};

export const buildInstructionBlock = (input: InstructionContext) => {
  const globalRules = GLOBAL_HARD_RULES.join(" ");
  const orgBlock = input.org
    ? [
        "Org instructions:",
        input.org.tag ? `- Tag: ${input.org.tag}` : null,
        input.org.tone ? `- Tone: ${input.org.tone}` : null,
        input.org.hardRules ? `- Hard rules: ${formatList(input.org.hardRules)}` : null,
        input.org.doList ? `- Do: ${formatList(input.org.doList)}` : null,
        input.org.dontList ? `- Don't: ${formatList(input.org.dontList)}` : null,
      ].filter(Boolean)
    : [];
  const styleBlock = input.style
    ? [
        "Style preset:",
        input.style.name ? `- Name: ${input.style.name}` : null,
        input.style.description ? `- Description: ${input.style.description}` : null,
        input.style.constraints?.tone ? `- Tone: ${input.style.constraints.tone}` : null,
        input.style.constraints?.length ? `- Length: ${input.style.constraints.length}` : null,
        input.style.constraints?.structure ? `- Structure: ${input.style.constraints.structure}` : null,
        input.style.constraints?.doList?.length
          ? `- Do: ${input.style.constraints.doList.join("; ")}`
          : null,
        input.style.constraints?.dontList?.length
          ? `- Don't: ${input.style.constraints.dontList.join("; ")}`
          : null,
      ].filter(Boolean)
    : [];
  const contextBlock = input.context?.length ? ["Context:", ...input.context] : [];
  const userBlock = input.user
    ? [
        "User preferences:",
        input.user.tone ? `- Tone: ${input.user.tone}` : null,
        input.user.notes ? `- Notes: ${input.user.notes}` : null,
      ].filter(Boolean)
    : [];

  const block = [
    "Global hard rules:",
    `- ${globalRules}`,
    "",
    ...orgBlock,
    orgBlock.length ? "" : null,
    ...userBlock,
    userBlock.length ? "" : null,
    ...styleBlock,
    styleBlock.length ? "" : null,
    ...contextBlock,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { block, rules: GLOBAL_HARD_RULES, globalRules };
};
