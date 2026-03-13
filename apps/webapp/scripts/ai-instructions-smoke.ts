import { buildInstructionBlock, GLOBAL_HARD_RULES } from "@/lib/ai/instructionsCore";

const result = buildInstructionBlock({
  org: {
    tag: "TEST",
    tone: "Direct",
    hardRules: "No hype",
    doList: "Be concrete",
    dontList: "No fluff",
  },
  style: {
    id: "test",
    name: "Test",
    description: "Test preset",
    constraints: {
      tone: "Neutral",
      length: "Short",
      structure: "Bullets",
      doList: ["Use facts"],
      dontList: ["No guesses"],
    },
  },
  context: ["Example context"],
});

const missingGlobal = GLOBAL_HARD_RULES.some((rule) => !result.block.includes(rule));
const hasOrg = result.block.includes("Org instructions:");
const hasStyle = result.block.includes("Style preset:");

if (missingGlobal || !hasOrg || !hasStyle) {
  console.error("ai:smoke: FAILED");
  process.exit(1);
}

console.log("ai:smoke: OK");
