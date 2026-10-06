-- AlterTable
ALTER TABLE "Student" ADD COLUMN "hackerRankContestName" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankContestSlug" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankResult" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankResultSource" TEXT;

-- CreateTable
CREATE TABLE "HackerRankContestSetting" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "passScore" REAL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HackerRankResultOverride" (
    "studentId" TEXT NOT NULL,
    "contestSlug" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("studentId", "contestSlug"),
    CONSTRAINT "HackerRankResultOverride_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HackerRankResultOverride_contestSlug_idx" ON "HackerRankResultOverride"("contestSlug");

-- CreateIndex
CREATE INDEX "Student_hackerRankResult_idx" ON "Student"("hackerRankResult");

