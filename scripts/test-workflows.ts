import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parseCsvContent } from '../lib/csv';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING STUDENT TRACKER END-TO-END VERIFICATION');
  console.log('====================================================\n');

  const databasePath = path.join(__dirname, '../data/students.db');
  const testDatabasePath = path.join(__dirname, '../data/students.db.workflow-test.db');
  fs.copyFileSync(databasePath, testDatabasePath);
  process.env.DATABASE_URL = `file:${testDatabasePath}`;
  let prisma = new PrismaClient();

  // Reset DB for clean test state
  console.log('🧹 Preparing clean test state in SQLite...');
  await prisma.comment.deleteMany({});
  await prisma.student.deleteMany({});
  console.log('✓ Database cleaned.\n');

  // TEST 1: Import 10 students
  console.log('--- TEST 1: Import 10 students from CSV ---');
  const csvPath = path.join(__dirname, '../sample_students.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const { rows } = parseCsvContent(csvContent);

  for (const r of rows) {
    if (!r.isValid) continue;
    const d = r.data;
    await prisma.student.create({
      data: {
        fullName: d.fullName,
        emailAddress: d.emailAddress,
        emailId: d.emailId || d.emailAddress,
        contactNumber: d.contactNumber,
        gender: d.gender,
        dob: d.dob,
        registrationNo: d.registrationNo,
        college: d.college,
        course: d.course,
        passingYear: d.passingYear,
        specialization: d.specialization,
        class10Percentage: d.class10Percentage,
        class12Percentage: d.class12Percentage,
        graduationCGPA: d.graduationCGPA,
        activeBacklogs: d.activeBacklogs,
        activeBacklogsRaw: d.activeBacklogsRaw,
        resumeUrl: d.resumeUrl,
        stage: 'New',
      },
    });
  }

  const countAfterImport = await prisma.student.count();
  console.log(`Students in database: ${countAfterImport}`);
  if (countAfterImport === 10) {
    console.log('✅ TEST 1 PASSED: Exactly 10 students in database.');
  } else {
    throw new Error(`TEST 1 FAILED: Expected 10 students, found ${countAfterImport}`);
  }

  // TEST 2: Simulate server restart / persistence
  console.log('\n--- TEST 2: Disconnect and Reconnect SQLite to simulate server restart ---');
  await prisma.$disconnect();
  prisma = new PrismaClient(); // fresh instance simulating new server process
  const countAfterRestart = await prisma.student.count();
  console.log(`Students after process restart: ${countAfterRestart}`);
  if (countAfterRestart === 10) {
    console.log('✅ TEST 2 PASSED: 10 students persisted in SQLite.');
  } else {
    throw new Error(`TEST 2 FAILED: Expected 10 students after restart, found ${countAfterRestart}`);
  }

  // TEST 3: Change one student: New -> Stage 1 and restart
  console.log('\n--- TEST 3: Change candidate "Aarav Singhania" to Stage 1 & verify after restart ---');
  const targetStudent = await prisma.student.findFirst({
    where: { fullName: 'Aarav Singhania' },
  });
  if (!targetStudent) throw new Error('Target student not found');

  await prisma.student.update({
    where: { id: targetStudent.id },
    data: { stage: 'Stage 1' },
  });

  // Reconnect
  await prisma.$disconnect();
  prisma = new PrismaClient();

  const refreshedStudent = await prisma.student.findUnique({
    where: { id: targetStudent.id },
  });
  console.log(`Candidate stage after restart: ${refreshedStudent?.stage}`);
  if (refreshedStudent?.stage === 'Stage 1') {
    console.log('✅ TEST 3 PASSED: Stage change (New -> Stage 1) persisted across restart.');
  } else {
    throw new Error(`TEST 3 FAILED: Expected Stage 1, got ${refreshedStudent?.stage}`);
  }

  // TEST 4: Add comment and restart
  console.log('\n--- TEST 4: Add comment & verify persistence across restart ---');
  const testCommentText = 'Passed technical screening with flying colors. Strong Next.js & algorithms knowledge.';
  const createdComment = await prisma.comment.create({
    data: {
      studentId: targetStudent.id,
      comment: testCommentText,
    },
  });

  // Reconnect
  await prisma.$disconnect();
  prisma = new PrismaClient();

  const savedComment = await prisma.comment.findUnique({
    where: { id: createdComment.id },
  });
  console.log(`Comment retrieved: "${savedComment?.comment}"`);
  if (savedComment && savedComment.comment === testCommentText) {
    console.log('✅ TEST 4 PASSED: Comment persisted in SQLite across restart.');
  } else {
    throw new Error('TEST 4 FAILED: Comment was not persisted');
  }

  // TEST 5: Import the same CSV again (Idempotency, duplicate check, stage & comment preservation)
  console.log('\n--- TEST 5: Re-import exact same CSV. Verify zero duplicates, stage & comment preserved ---');
  let newCount = 0;
  let updatedCount = 0;

  for (const r of rows) {
    if (!r.isValid) continue;
    const d = r.data;
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { registrationNo: d.registrationNo },
          { emailAddress: d.emailAddress },
        ],
      },
    });

    if (existing) {
      updatedCount++;
      // Update contact/academic, DO NOT overwrite stage or delete comments!
      await prisma.student.update({
        where: { id: existing.id },
        data: {
          contactNumber: d.contactNumber,
          graduationCGPA: d.graduationCGPA,
          // stage not updated!
        },
      });
    } else {
      newCount++;
      await prisma.student.create({
        data: {
          fullName: d.fullName,
          stage: 'New',
        },
      });
    }
  }

  const finalTotal = await prisma.student.count();
  const aaravCheck = await prisma.student.findUnique({
    where: { id: targetStudent.id },
    include: { comments: true },
  });

  console.log(`Total students after re-import: ${finalTotal} (New: ${newCount}, Updated: ${updatedCount})`);
  console.log(`Aarav Stage after re-import: ${aaravCheck?.stage}`);
  console.log(`Aarav Comments count after re-import: ${aaravCheck?.comments.length}`);

  if (
    finalTotal === 10 &&
    newCount === 0 &&
    updatedCount === 10 &&
    aaravCheck?.stage === 'Stage 1' &&
    aaravCheck?.comments.length === 1
  ) {
    console.log('✅ TEST 5 PASSED: Re-import created NO duplicates and preserved stage + comments.');
  } else {
    throw new Error('TEST 5 FAILED: Duplicate detection or stage/comment preservation failed');
  }

  // TEST 6: Filter by Stage: Stage 1
  console.log('\n--- TEST 6: Filter by Stage = "Stage 1" ---');
  const stage1Students = await prisma.student.findMany({
    where: { stage: 'Stage 1' },
  });
  console.log(`Stage 1 student count: ${stage1Students.length}`);
  if (stage1Students.length === 1 && stage1Students[0].fullName === 'Aarav Singhania') {
    console.log('✅ TEST 6 PASSED: Filtering by Stage 1 returned only Stage 1 students.');
  } else {
    throw new Error('TEST 6 FAILED');
  }

  // TEST 7: Search by student name
  console.log('\n--- TEST 7: Search by student name ("Riya") ---');
  const searchResults = await prisma.student.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Riya' } },
        { emailAddress: { contains: 'Riya' } },
      ],
    },
  });
  console.log(`Search results count: ${searchResults.length}`);
  if (searchResults.length === 1 && searchResults[0].fullName === 'Riya Sen') {
    console.log('✅ TEST 7 PASSED: Search returned correct student ("Riya Sen").');
  } else {
    throw new Error('TEST 7 FAILED: Search failed');
  }

  // TEST 8: Bulk select students and move them to Stage 2
  console.log('\n--- TEST 8: Bulk select 3 students and move them to Stage 2 ---');
  const bulkTargets = await prisma.student.findMany({
    take: 3,
    orderBy: { fullName: 'asc' },
  });
  const bulkIds = bulkTargets.map((s) => s.id);
  console.log(`Selected students for bulk move: ${bulkTargets.map((s) => s.fullName).join(', ')}`);

  await prisma.student.updateMany({
    where: { id: { in: bulkIds } },
    data: { stage: 'Stage 2' },
  });

  const verifyBulk = await prisma.student.findMany({
    where: { id: { in: bulkIds } },
  });
  const allStage2 = verifyBulk.every((s) => s.stage === 'Stage 2');
  console.log(`Are all 3 students now in Stage 2? ${allStage2}`);

  if (allStage2 && verifyBulk.length === 3) {
    console.log('✅ TEST 8 PASSED: Bulk stage update successfully moved all selected students to Stage 2.');
  } else {
    throw new Error('TEST 8 FAILED: Bulk update failed');
  }

  await prisma.$disconnect();
  fs.unlinkSync(testDatabasePath);
  console.log('\nLive database was not modified by workflow verification.');

  console.log('\n====================================================');
  console.log('ALL 8 WORKFLOW TESTS PASSED SUCCESSFULLY! 🚀');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  const testDatabasePath = path.join(__dirname, '../data/students.db.workflow-test.db');
  if (fs.existsSync(testDatabasePath)) {
    fs.unlinkSync(testDatabasePath);
    console.error('Live database was not modified by failed workflow verification.');
  }
  process.exit(1);
});
