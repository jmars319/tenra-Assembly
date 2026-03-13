import "server-only";

export {
  GLOBAL_HARD_RULES,
  type InstructionContext,
  buildInstructionBlock,
} from "@/lib/ai/instructionsCore";

import type { InstructionContext } from "@/lib/ai/instructionsCore";
import { getPrismaClient } from "@/lib/prisma";
import { stylePresets } from "@/lib/content/stylePresets";

export type OrgInstructions = InstructionContext["org"];

type ResolveInstructionInput = {
  workspaceId: string;
  userId?: string;
  stylePresetId?: string;
  orgTag?: string;
  orgOverride?: {
    tone?: string;
    hardRules?: string;
    doList?: string;
    dontList?: string;
  };
  context?: string[];
};

const mergeText = (base?: string, override?: string) => {
  if (!base && !override) return undefined;
  if (base && override) return `${base}\n${override}`;
  return override ?? base;
};

const resolveStyleId = async (input: ResolveInstructionInput) => {
  if (input.stylePresetId) return input.stylePresetId;
  if (!input.userId) return undefined;
  const prisma = getPrismaClient();
  const preference = await prisma.userStylePreference.findUnique({
    where: {
      userId_workspaceId: {
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    },
  });
  return preference?.defaultStyleId ?? undefined;
};

const mapWorkspaceStyle = (style: { name: string; description?: string | null; instructions: unknown }) => {
  const instructions =
    style.instructions && typeof style.instructions === "object" ? (style.instructions as Record<string, unknown>) : {};
  const toList = (value: unknown) =>
    typeof value === "string"
      ? value
          .split(/[\n,]+/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
  return {
    name: style.name,
    description: style.description ?? undefined,
    constraints: {
      tone: typeof instructions.tone === "string" ? instructions.tone : undefined,
      length: undefined,
      structure: typeof instructions.hardRules === "string" ? instructions.hardRules : undefined,
      doList: toList(instructions.doList),
      dontList: toList(instructions.dontList),
    },
  };
};

export const resolveInstructionContext = async (
  input: ResolveInstructionInput,
): Promise<InstructionContext> => {
  const prisma = getPrismaClient();
  const [workspace, userInstruction, resolvedStyleId] = await Promise.all([
    prisma.workspaceInstruction.findUnique({ where: { workspaceId: input.workspaceId } }),
    input.userId ? prisma.userInstruction.findUnique({ where: { userId: input.userId } }) : null,
    resolveStyleId(input),
  ]);

  let style: InstructionContext["style"];
  if (resolvedStyleId) {
    const workspaceStyle = await prisma.workspaceStyle.findFirst({
      where: { id: resolvedStyleId, workspaceId: input.workspaceId },
    });
    if (workspaceStyle) {
      style = { id: workspaceStyle.id, ...mapWorkspaceStyle(workspaceStyle) };
    } else {
      const preset = stylePresets.find((item) => item.id === resolvedStyleId);
      if (preset) {
        style = {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          constraints: preset.constraints,
        };
      }
    }
  }

  return {
    org: {
      tag: input.orgTag,
      tone: input.orgOverride?.tone ?? workspace?.tone ?? undefined,
      hardRules: mergeText(workspace?.hardRules ?? undefined, input.orgOverride?.hardRules),
      doList: mergeText(workspace?.doList ?? undefined, input.orgOverride?.doList),
      dontList: mergeText(workspace?.dontList ?? undefined, input.orgOverride?.dontList),
    },
    user: userInstruction
      ? {
          tone: userInstruction.tone ?? undefined,
          notes: userInstruction.notes ?? undefined,
        }
      : undefined,
    style,
    context: input.context,
  };
};

export const resolveStylePresetId = resolveStyleId;
