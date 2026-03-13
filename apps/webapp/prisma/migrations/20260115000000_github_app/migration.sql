-- CreateTable
CREATE TABLE "GitHubInstallation" (
    "id" TEXT NOT NULL,
    "installationId" INTEGER NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallation_installationId_key" ON "GitHubInstallation"("installationId");

-- CreateTable
CREATE TABLE "GitHubRepo" (
    "id" TEXT NOT NULL,
    "repoId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,
    "ownerLogin" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installationId" TEXT NOT NULL,

    CONSTRAINT "GitHubRepo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepo_repoId_key" ON "GitHubRepo"("repoId");

-- AddForeignKey
ALTER TABLE "GitHubRepo" ADD CONSTRAINT "GitHubRepo_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "GitHubInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
