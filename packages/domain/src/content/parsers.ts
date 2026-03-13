import type { BlogFeature, ProjectNoteRow, SystemsMemo } from "@assembly/shared-types/content";

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, ""));
};

export const parseCsv = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
  return { headers, rows };
};

export const parseProjectNoteRows = (text: string): ProjectNoteRow[] => {
  const { headers, rows } = parseCsv(text);
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const getField = (row: Record<string, string>, key: string) => {
    const index = normalizedHeaders.indexOf(key);
    if (index === -1) return "";
    const header = headers[index];
    return row[header] ?? "";
  };

  return rows.map((row) => ({
    caseStudySlug: getField(row, "case_study_slug"),
    date: getField(row, "date"),
    metric: getField(row, "metric"),
    detail: getField(row, "detail"),
    sourceLink: getField(row, "source_link") || null,
  }));
};

export const parseSystemsMemoMarkdown = (input: string): SystemsMemo => {
  const lines = input.split(/\r?\n/);
  let section: "thesis" | "points" | "example" | "takeaway" | null = null;
  const memo: SystemsMemo = { thesis: "", points: [], example: "", takeaway: "" };

  const commitLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (section === "points") {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
        memo.points.push(trimmed.replace(/^[-*•]\s+/, ""));
      } else {
        memo.points.push(trimmed);
      }
      return;
    }
    if (section === "thesis") memo.thesis += `${memo.thesis ? "\n" : ""}${trimmed}`;
    if (section === "example") memo.example += `${memo.example ? "\n" : ""}${trimmed}`;
    if (section === "takeaway") memo.takeaway += `${memo.takeaway ? "\n" : ""}${trimmed}`;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^thesis:/i.test(trimmed)) {
      section = "thesis";
      const rest = trimmed.replace(/^thesis:\s*/i, "");
      if (rest) commitLine(rest);
      continue;
    }
    if (/^points:/i.test(trimmed)) {
      section = "points";
      const rest = trimmed.replace(/^points:\s*/i, "");
      if (rest) commitLine(rest);
      continue;
    }
    if (/^example:/i.test(trimmed)) {
      section = "example";
      const rest = trimmed.replace(/^example:\s*/i, "");
      if (rest) commitLine(rest);
      continue;
    }
    if (/^takeaway:/i.test(trimmed)) {
      section = "takeaway";
      const rest = trimmed.replace(/^takeaway:\s*/i, "");
      if (rest) commitLine(rest);
      continue;
    }
    commitLine(line);
  }

  return memo;
};

export const parseBullets = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, ""));

export const normalizeBulletText = (input: string) => {
  if (parseBullets(input).length > 0) return input;
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const chunks = lines.flatMap((line) => line.split(/[.!?]+/)).map((item) => item.trim()).filter(Boolean);
  if (chunks.length === 0) return input;
  return chunks.map((chunk) => `- ${chunk}`).join("\n");
};

export const parseFrontmatterLoose = (input: string): BlogFeature => {
  const trimmed = input.trim();
  if (!trimmed.startsWith("---")) {
    return {
      title: "",
      primary_keyword: "",
      body: trimmed,
    };
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    return {
      title: "",
      primary_keyword: "",
      body: trimmed,
    };
  }
  const rawFrontmatter = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).trim();
  const lines = rawFrontmatter.split(/\r?\n/);
  const data: Record<string, string | string[]> = {};
  let currentKey: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s*-\s+/.test(line) && currentKey) {
      const value = line.replace(/^\s*-\s+/, "").trim();
      const existing = data[currentKey];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        data[currentKey] = [value];
      }
      continue;
    }

    const [keyRaw, ...rest] = line.split(":");
    if (!keyRaw || rest.length === 0) continue;
    const key = keyRaw.trim();
    const valueRaw = rest.join(":").trim();
    currentKey = key;
    if (valueRaw.startsWith("[") && valueRaw.endsWith("]")) {
      const list = valueRaw
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      data[key] = list;
    } else {
      data[key] = valueRaw.replace(/^"|"$/g, "");
    }
  }

  return {
    title: String(data.title ?? ""),
    primary_keyword: String(data.primary_keyword ?? ""),
    related_keywords: Array.isArray(data.related_keywords) ? data.related_keywords : undefined,
    internal_links: Array.isArray(data.internal_links) ? data.internal_links : undefined,
    source_links: Array.isArray(data.source_links) ? data.source_links : undefined,
    body,
  };
};

export const parseFrontmatter = (input: string): BlogFeature => {
  const trimmed = input.trim();
  if (!trimmed.startsWith("---")) {
    throw new Error("Missing frontmatter.");
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error("Unterminated frontmatter.");
  }
  const rawFrontmatter = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).trim();
  const lines = rawFrontmatter.split(/\r?\n/);
  const data: Record<string, string | string[]> = {};
  let currentKey: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s*-\s+/.test(line) && currentKey) {
      const value = line.replace(/^\s*-\s+/, "").trim();
      const existing = data[currentKey];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        data[currentKey] = [value];
      }
      continue;
    }

    const [keyRaw, ...rest] = line.split(":");
    if (!keyRaw || rest.length === 0) continue;
    const key = keyRaw.trim();
    const valueRaw = rest.join(":").trim();
    currentKey = key;
    if (valueRaw.startsWith("[") && valueRaw.endsWith("]")) {
      const list = valueRaw
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      data[key] = list;
    } else {
      data[key] = valueRaw.replace(/^"|"$/g, "");
    }
  }

  return {
    title: String(data.title ?? ""),
    primary_keyword: String(data.primary_keyword ?? ""),
    related_keywords: Array.isArray(data.related_keywords) ? data.related_keywords : undefined,
    internal_links: Array.isArray(data.internal_links) ? data.internal_links : undefined,
    source_links: Array.isArray(data.source_links) ? data.source_links : undefined,
    body,
  };
};
