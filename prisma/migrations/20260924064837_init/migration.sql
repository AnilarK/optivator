-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" TEXT,
    "emailAddress" TEXT,
    "fullName" TEXT NOT NULL,
    "gender" TEXT,
    "dob" TEXT,
    "contactNumber" TEXT,
    "emailId" TEXT,
    "registrationNo" TEXT,
    "college" TEXT,
    "course" TEXT,
    "passingYear" INTEGER,
    "specialization" TEXT,
    "class10Percentage" REAL,
    "class12Percentage" REAL,
    "graduationCGPA" REAL,
    "activeBacklogs" BOOLEAN NOT NULL DEFAULT false,
    "activeBacklogsRaw" TEXT,
    "resumeUrl" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'New',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Student_registrationNo_idx" ON "Student"("registrationNo");

-- CreateIndex
CREATE INDEX "Student_emailId_idx" ON "Student"("emailId");

-- CreateIndex
CREATE INDEX "Student_emailAddress_idx" ON "Student"("emailAddress");

-- CreateIndex
CREATE INDEX "Student_stage_idx" ON "Student"("stage");

-- CreateIndex
CREATE INDEX "Student_college_idx" ON "Student"("college");

-- CreateIndex
CREATE INDEX "Student_passingYear_idx" ON "Student"("passingYear");

-- CreateIndex
CREATE INDEX "Comment_studentId_idx" ON "Comment"("studentId");
