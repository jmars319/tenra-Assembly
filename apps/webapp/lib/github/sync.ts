import "server-only";
import type { PrismaClient } from "@prisma/client";
import { githubApiFetch } from "@/lib/github/client";

type GitHubRepoPayload = {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  owner?: { login?: string };
};

export const fetchInstallationRepos = async (installationId: number) => {
  const allRepos: GitHubRepoPayload[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await githubApiFetch(
      installationId,
      `/installation/repositories?per_page=${perPage}&page=${page}`
    );
    const payload = (await res.json()) as { repositories?: GitHubRepoPayload[] };
    const batch = payload.repositories ?? [];
    allRepos.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return allRepos;
};

export const syncInstallationRepos = async (
  prisma: PrismaClient,
  workspaceId: string,
  installationDbId: string,
  installationId: number
) => {
  const repos = await fetchInstallationRepos(installationId);
  const now = new Date();

  await Promise.all(
    repos.map((repo) =>
      prisma.gitHubRepo.upsert({
        where: { workspaceId_repoId: { workspaceId, repoId: repo.id } },
        update: {
          fullName: repo.full_name,
          name: repo.name,
          private: repo.private,
          ownerLogin: repo.owner?.login ?? "",
          lastSeenAt: now,
          installationId: installationDbId,
        },
        create: {
          workspaceId,
          repoId: repo.id,
          fullName: repo.full_name,
          name: repo.name,
          private: repo.private,
          ownerLogin: repo.owner?.login ?? "",
          selected: false,
          lastSeenAt: now,
          installationId: installationDbId,
        },
      })
    )
  );

  return repos.length;
};
