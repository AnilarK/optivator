ALTER TABLE "Student" ADD COLUMN "hackerRankUsername" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankId" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankMatchStatus" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankMatchType" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankScore" REAL;
ALTER TABLE "Student" ADD COLUMN "hackerRankRank" INTEGER;
ALTER TABLE "Student" ADD COLUMN "hackerRankContestTimeTaken" REAL;
ALTER TABLE "Student" ADD COLUMN "hackerRankQuestionsSolved" INTEGER;
ALTER TABLE "Student" ADD COLUMN "hackerRankQuestionsJson" TEXT;
ALTER TABLE "Student" ADD COLUMN "hackerRankQuestion1Minutes" REAL;
ALTER TABLE "Student" ADD COLUMN "hackerRankQuestion2Minutes" REAL;
ALTER TABLE "Student" ADD COLUMN "hackerRankLastSyncedAt" DATETIME;

CREATE TABLE "HackerRankSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contestSlug" TEXT NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL
);

CREATE INDEX "Student_hackerRankUsername_idx" ON "Student"("hackerRankUsername");
CREATE INDEX "Student_hackerRankMatchStatus_idx" ON "Student"("hackerRankMatchStatus");
CREATE INDEX "Student_hackerRankScore_idx" ON "Student"("hackerRankScore");
CREATE INDEX "Student_hackerRankQuestionsSolved_idx" ON "Student"("hackerRankQuestionsSolved");
CREATE INDEX "Student_hackerRankQuestion1Minutes_idx" ON "Student"("hackerRankQuestion1Minutes");
CREATE INDEX "Student_hackerRankQuestion2Minutes_idx" ON "Student"("hackerRankQuestion2Minutes");