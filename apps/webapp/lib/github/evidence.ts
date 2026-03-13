import "server-only";
import { githubApiFetch } from "@/lib/github/client";

type CommitPayload = {
  sha: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string };
  };
  html_url?: string;
};

type CommitDetailPayload = CommitPayload & {
  files?: { filename?: string; patch?: string }[];
};

type PullPayload = {
  number: number;
  title: string;
  body?: string | null;
  html_url?: string;
  created_at?: string;
  merged_at?: string | null;
  updated_at?: string;
};

type ReleasePayload = {
  id: number;
  name?: string | null;
  body?: string | null;
  html_url?: string;
  published_at?: string | null;
  created_at?: string;
};

const MAX_ITEMS = 500;
const MAX_DOC_FILES = 12;
const MAX_DOC_CHARS = 20000;

const toIso = (value?: string) => (value ? new Date(value).toISOString() : new Date().toISOString());

const truncateText = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, limit).trim()}...` : value;

const decodeContent = (content?: string, encoding?: string) => {
  if (!content) return "";
  if (encoding === "base64") {
    return Buffer.from(content, "base64").toString("utf-8");
  }
  return content;
};

const isDocFile = (path: string) =>
  path.toLowerCase().endsWith(".md") ||
  path.toLowerCase().endsWith(".mdx") ||
  path.toLowerCase().endsWith(".txt");

type ContentEntry = {
  type: "file" | "dir";
  path: string;
  name: string;
  download_url?: string | null;
  content?: string;
  encoding?: string;
  html_url?: string;
};

const fetchContentEntry = async (installationId: number, fullName: string, path: string) => {
  const [owner, repo] = fullName.split("/");
  const res = await githubApiFetch(
    installationId,
    `/repos/${owner}/${repo}/contents/${path}`
  );
  return res.json() as Promise<ContentEntry | ContentEntry[]>;
};

const fetchReadme = async (installationId: number, fullName: string) => {
  const [owner, repo] = fullName.split("/");
  const res = await githubApiFetch(installationId, `/repos/${owner}/${repo}/readme`);
  if (!res.ok) return null;
  const data = (await res.json()) as ContentEntry;
  return data;
};

export const fetchCommits = async (
  installationId: number,
  fullName: string,
  since?: string,
  includeContent?: boolean
) => {
  const [owner, repo] = fullName.split("/");
  const commits: CommitDetailPayload[] = [];
  let page = 1;
  const perPage = 100;

  while (commits.length < MAX_ITEMS) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    if (since) url.searchParams.set("since", since);

    const res = await githubApiFetch(installationId, url.pathname + url.search);
    const data = (await res.json()) as CommitPayload[];
    if (data.length === 0) break;

    if (includeContent) {
      const details = await Promise.all(
        data.map(async (commit) => {
          const detailRes = await githubApiFetch(
            installationId,
            `/repos/${owner}/${repo}/commits/${commit.sha}`
          );
          const detail = (await detailRes.json()) as CommitDetailPayload;
          return detail;
        })
      );
      commits.push(...details);
    } else {
      commits.push(...data);
    }

    if (data.length < perPage) break;
    page += 1;
  }

  return commits.slice(0, MAX_ITEMS).map((commit) => ({
    type: "COMMIT" as const,
    title: commit.commit.message.split("\n")[0] || "Commit",
    body: commit.commit.message,
    url: commit.html_url ?? undefined,
    occurredAt: toIso(commit.commit.author?.date),
    content: includeContent
      ? (commit.files ?? [])
          .map((file) => `${file.filename ?? "file"}:\n${file.patch ?? ""}`)
          .join("\n\n")
      : undefined,
    metadata: { sha: commit.sha, author: commit.commit.author?.name ?? "unknown" },
  }));
};

export const fetchPullRequests = async (installationId: number, fullName: string, since?: string) => {
  const [owner, repo] = fullName.split("/");
  const pulls: PullPayload[] = [];
  let page = 1;
  const perPage = 100;

  while (pulls.length < MAX_ITEMS) {
    const res = await githubApiFetch(
      installationId,
      `/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&page=${page}`
    );
    const data = (await res.json()) as PullPayload[];
    if (data.length === 0) break;
    pulls.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }

  const filtered = since
    ? pulls.filter((pr) => new Date(pr.updated_at ?? pr.created_at ?? 0) >= new Date(since))
    : pulls;

  return filtered.slice(0, MAX_ITEMS).map((pr) => ({
    type: "PULL_REQUEST" as const,
    title: pr.title || "Pull request",
    body: pr.body ?? "",
    url: pr.html_url ?? undefined,
    occurredAt: toIso(pr.merged_at ?? pr.updated_at ?? pr.created_at ?? undefined),
    metadata: { number: pr.number },
  }));
};

export const fetchReleases = async (installationId: number, fullName: string, since?: string) => {
  const [owner, repo] = fullName.split("/");
  const releases: ReleasePayload[] = [];
  let page = 1;
  const perPage = 100;

  while (releases.length < MAX_ITEMS) {
    const res = await githubApiFetch(
      installationId,
      `/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`
    );
    const data = (await res.json()) as ReleasePayload[];
    if (data.length === 0) break;
    releases.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }

  const filtered = since
    ? releases.filter((release) => new Date(release.published_at ?? release.created_at ?? 0) >= new Date(since))
    : releases;

  return filtered.slice(0, MAX_ITEMS).map((release) => ({
    type: "RELEASE" as const,
    title: release.name ?? "Release",
    body: release.body ?? "",
    url: release.html_url ?? undefined,
    occurredAt: toIso(release.published_at ?? release.created_at ?? undefined),
    metadata: { releaseId: release.id },
  }));
};

export const fetchDocumentation = async (installationId: number, fullName: string) => {
  const docs: Array<{
    type: "DOCUMENTATION";
    title: string;
    body?: string;
    url?: string;
    occurredAt: string;
    content?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  const addDoc = (path: string, entry: ContentEntry) => {
    if (!isDocFile(path)) return;
    const content = truncateText(decodeContent(entry.content, entry.encoding), MAX_DOC_CHARS);
    docs.push({
      type: "DOCUMENTATION",
      title: path,
      body: truncateText(content, 300),
      url: entry.html_url ?? undefined,
      occurredAt: toIso(),
      content,
      metadata: { path },
    });
  };

  const readme = await fetchReadme(installationId, fullName);
  if (readme?.content) {
    addDoc(readme.path ?? "README.md", readme);
  }

  const changelogCandidates = ["CHANGELOG.md", "changelog.md"];
  for (const candidate of changelogCandidates) {
    try {
      const entry = await fetchContentEntry(installationId, fullName, candidate);
      if (Array.isArray(entry)) continue;
      if (entry?.content) addDoc(candidate, entry);
    } catch {
      // ignore missing changelog
    }
  }

  const walkDocs = async (path: string) => {
    if (docs.length >= MAX_DOC_FILES) return;
    const entry = await fetchContentEntry(installationId, fullName, path);
    if (Array.isArray(entry)) {
      for (const item of entry) {
        if (docs.length >= MAX_DOC_FILES) break;
        if (item.type === "dir") {
          await walkDocs(item.path);
        } else if (item.type === "file") {
          const fileEntry = await fetchContentEntry(installationId, fullName, item.path);
          if (!Array.isArray(fileEntry) && fileEntry?.content) {
            addDoc(item.path, fileEntry);
          }
        }
      }
    } else if (entry?.type === "file" && entry.content) {
      addDoc(entry.path, entry);
    }
  };

  try {
    await walkDocs("docs");
  } catch {
    // ignore missing docs folder
  }

  return docs.slice(0, MAX_DOC_FILES);
};
