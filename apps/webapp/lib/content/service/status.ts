import { getPrismaClient } from "@/lib/prisma";

import { requireDb } from "./shared";

export const getContentStatus = async (workspaceId: string) => {
  requireDb();
  const prisma = getPrismaClient();
  const grouped = await prisma.contentItem.groupBy({
    by: ["type", "status"],
    where: { workspaceId },
    _count: { _all: true },
  });

  const counts: Record<string, Record<string, number>> = {};
  grouped.forEach((entry) => {
    if (!counts[entry.type]) counts[entry.type] = {};
    counts[entry.type][entry.status] = entry._count._all;
  });

  const cadenceItems = await prisma.contentItem.findMany({
    where: { cadenceTarget: { not: null }, workspaceId },
    orderBy: { createdAt: "desc" },
  });

  const cadenceMap: Record<string, number> = {
    MONTHLY: 30,
    BIMONTHLY: 60,
    QUARTERLY: 90,
    SIX_WEEKS: 42,
    AD_HOC: 9999,
  };

  const seen = new Set<string>();
  const reminders = cadenceItems
    .filter((item) => {
      if (seen.has(item.type)) return false;
      seen.add(item.type);
      const targetDays = item.cadenceTarget ? cadenceMap[item.cadenceTarget] : 0;
      if (targetDays <= 0 || targetDays >= 9999) return false;
      const ageDays = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= targetDays;
    })
    .map((item) => ({
      type: item.type,
      lastCreatedAt: item.createdAt,
      cadenceTarget: item.cadenceTarget,
    }));

  return { counts, reminders };
};

export const getCoverageMatrix = async (workspaceId: string) => {
  requireDb();
  const prisma = getPrismaClient();
  const items = await prisma.contentItem.findMany({
    where: {
      workspaceId,
      type: { in: ["BLOG_FEATURE", "SYSTEMS_MEMO", "FIELD_NOTE"] },
      topics: { isEmpty: false },
    },
  });

  const matrix: Record<string, Record<string, number>> = {};
  items.forEach((item) => {
    item.topics.forEach((topic) => {
      if (!matrix[topic]) {
        matrix[topic] = { BLOG_FEATURE: 0, SYSTEMS_MEMO: 0, FIELD_NOTE: 0 };
      }
      matrix[topic][item.type] += 1;
    });
  });

  return { matrix };
};
