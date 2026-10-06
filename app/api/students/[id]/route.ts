import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidStage } from '@/lib/stages';
import { parseHackerRankQuestions } from '@/lib/hackerrank';
import { applyPrimaryContest } from '@/lib/hackerrank-admin/primary';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const { hackerRankQuestionsJson, ...studentRecord } = student;
    return NextResponse.json({
      success: true,
      student: { ...studentRecord, hackerRankQuestions: parseHackerRankQuestions(hackerRankQuestionsJson) },
    });
  } catch (error) {
    console.error('Error in GET /api/students/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve student' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();

    const existing = await prisma.student.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Validate stage if provided
    if (body.stage !== undefined && !isValidStage(body.stage)) {
      return NextResponse.json(
        { success: false, error: `Invalid stage: ${body.stage}` },
        { status: 400 }
      );
    }

    const stageChanged = body.stage !== undefined && body.stage !== existing.stage;
    // Editing the HackerRank username by hand is a manual link (clearing it = manual unlink).
    const newHackerRankUsername = body.hackerRankUsername !== undefined ? body.hackerRankUsername?.trim() || null : undefined;
    const hackerRankChanged = newHackerRankUsername !== undefined &&
      (newHackerRankUsername || '').toLowerCase() !== (existing.hackerRankUsername || '').toLowerCase();
    if (hackerRankChanged && newHackerRankUsername) {
      // SQLite has no case-insensitive mode in Prisma, so compare in JS.
      const others = await prisma.student.findMany({
        where: { id: { not: params.id }, hackerRankUsername: { not: null } },
        select: { fullName: true, hackerRankUsername: true },
      });
      const owner = others.find((other) => other.hackerRankUsername?.toLowerCase() === newHackerRankUsername.toLowerCase());
      if (owner) {
        return NextResponse.json(
          { success: false, error: `HackerRank username @${newHackerRankUsername} is already linked to ${owner.fullName}.` },
          { status: 409 }
        );
      }
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: params.id },
        data: {
          fullName: body.fullName !== undefined ? body.fullName.trim() : undefined,
          emailAddress: body.emailAddress !== undefined ? body.emailAddress?.trim() || null : undefined,
          emailId: body.emailId !== undefined ? body.emailId?.trim() || null : undefined,
          registrationNo: body.registrationNo !== undefined ? body.registrationNo?.trim() || null : undefined,
          contactNumber: body.contactNumber !== undefined ? body.contactNumber?.trim() || null : undefined,
          gender: body.gender !== undefined ? body.gender?.trim() || null : undefined,
          dob: body.dob !== undefined ? body.dob?.trim() || null : undefined,
          college: body.college !== undefined ? body.college?.trim() || null : undefined,
          course: body.course !== undefined ? body.course?.trim() || null : undefined,
          passingYear:
            body.passingYear !== undefined
              ? body.passingYear
                ? parseInt(body.passingYear, 10)
                : null
              : undefined,
          specialization: body.specialization !== undefined ? body.specialization?.trim() || null : undefined,
          class10Percentage:
            body.class10Percentage !== undefined
              ? body.class10Percentage !== '' && body.class10Percentage !== null
                ? parseFloat(body.class10Percentage)
                : null
              : undefined,
          class12Percentage:
            body.class12Percentage !== undefined
              ? body.class12Percentage !== '' && body.class12Percentage !== null
                ? parseFloat(body.class12Percentage)
                : null
              : undefined,
          graduationCGPA:
            body.graduationCGPA !== undefined
              ? body.graduationCGPA !== '' && body.graduationCGPA !== null
                ? parseFloat(body.graduationCGPA)
                : null
              : undefined,
          atsScore:
            body.atsScore !== undefined
              ? body.atsScore !== '' && body.atsScore !== null
                ? parseFloat(body.atsScore)
                : null
              : undefined,
          cfRating:
            body.cfRating !== undefined
              ? body.cfRating !== '' && body.cfRating !== null
                ? parseFloat(body.cfRating)
                : null
              : undefined,
          leetcodeRating:
            body.leetcodeRating !== undefined
              ? body.leetcodeRating !== '' && body.leetcodeRating !== null
                ? parseFloat(body.leetcodeRating)
                : null
              : undefined,
          codechefRating:
            body.codechefRating !== undefined
              ? body.codechefRating !== '' && body.codechefRating !== null
                ? parseFloat(body.codechefRating)
                : null
              : undefined,
          hackerRankUsername: newHackerRankUsername,
          ...(hackerRankChanged
            ? { hackerRankMatchType: newHackerRankUsername ? 'manual' : 'unlinked', hackerRankId: null }
            : {}),
          activeBacklogs: body.activeBacklogs !== undefined ? Boolean(body.activeBacklogs) : undefined,
          activeBacklogsRaw:
            body.activeBacklogsRaw !== undefined
              ? body.activeBacklogsRaw
              : body.activeBacklogs !== undefined
              ? body.activeBacklogs
                ? 'Yes'
                : 'No'
              : undefined,
          resumeUrl: body.resumeUrl !== undefined ? body.resumeUrl?.trim() || null : undefined,
          stage: body.stage !== undefined ? body.stage : undefined,
        },
      });

      if (stageChanged) {
        await tx.comment.create({
          data: {
            studentId: params.id,
            comment: `Stage changed from ${existing.stage} to ${body.stage}.`,
          },
        });
      }

      return tx.student.findUnique({
        where: { id: params.id },
        include: {
          comments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    if (hackerRankChanged) {
      // Re-evaluate the primary contest so the dashboard result follows the new link.
      await applyPrimaryContest().catch((error) => console.error('Applying primary contest failed:', error instanceof Error ? error.message : error));
      const refreshed = await prisma.student.findUnique({
        where: { id: params.id },
        include: { comments: { orderBy: { createdAt: 'desc' } } },
      });
      return NextResponse.json({ success: true, student: refreshed });
    }

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error('Error in PATCH /api/students/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const existing = await prisma.student.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    await prisma.student.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/students/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
