import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { STAGES } from '@/lib/stages';
import { buildStudentWhere } from '@/lib/student-query';
import { parseHackerRankQuestions } from '@/lib/hackerrank';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));

    const where = buildStudentWhere(searchParams);

    // Determine order
    const orderBy: Prisma.StudentOrderByWithRelationInput = {};
    const validSortFields = ['fullName', 'graduationCGPA', 'passingYear', 'stage', 'updatedAt', 'createdAt', 'atsScore', 'cfRating', 'leetcodeRating', 'codechefRating'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy as keyof Prisma.StudentOrderByWithRelationInput] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { comments: true },
          },
        },
      }),
    ]);

    const [totalStudentsCount, stageCountsRaw, backlogCounts, distinctColleges, distinctBranches, distinctYears, distinctGenders] =
      await Promise.all([
        prisma.student.count(),
        prisma.student.groupBy({
          by: ['stage'],
          _count: { _all: true },
        }),
        prisma.student.groupBy({
          by: ['activeBacklogs'],
          _count: { _all: true },
        }),
        prisma.student.findMany({
          where: { college: { not: null } },
          select: { college: true },
          distinct: ['college'],
          orderBy: { college: 'asc' },
        }),
        prisma.student.findMany({
          where: { specialization: { not: null } },
          select: { specialization: true },
          distinct: ['specialization'],
          orderBy: { specialization: 'asc' },
        }),
        prisma.student.findMany({
          where: { passingYear: { not: null } },
          select: { passingYear: true },
          distinct: ['passingYear'],
          orderBy: { passingYear: 'desc' },
        }),
        prisma.student.findMany({
          where: { gender: { not: null } },
          select: { gender: true },
          distinct: ['gender'],
        }),
      ]);

    const stageCounts: Record<string, number> = {};
    STAGES.forEach((s) => {
      stageCounts[s] = 0;
    });
    stageCountsRaw.forEach((sc) => {
      stageCounts[sc.stage] = sc._count._all;
    });

    const noBacklogsCount = backlogCounts.find((entry) => !entry.activeBacklogs)?._count._all || 0;
    const hasBacklogsCount = backlogCounts.find((entry) => entry.activeBacklogs)?._count._all || 0;

    return NextResponse.json({
      success: true,
      students: students.map(({ hackerRankQuestionsJson, ...student }) => ({
        ...student,
        hackerRankQuestions: parseHackerRankQuestions(hackerRankQuestionsJson),
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
      stats: {
        total: totalStudentsCount,
        stageCounts,
        noBacklogsCount,
        hasBacklogsCount,
      },
      filterOptions: {
        colleges: distinctColleges.map((c) => c.college as string).filter(Boolean),
        branches: distinctBranches.map((b) => b.specialization as string).filter(Boolean),
        passingYears: distinctYears.map((y) => y.passingYear as number).filter(Boolean),
        genders: distinctGenders.map((g) => g.gender as string).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.fullName || !body.fullName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full Name is required' },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        fullName: body.fullName.trim(),
        emailAddress: body.emailAddress?.trim() || null,
        emailId: body.emailId?.trim() || body.emailAddress?.trim() || null,
        registrationNo: body.registrationNo?.trim() || null,
        contactNumber: body.contactNumber?.trim() || null,
        gender: body.gender?.trim() || null,
        dob: body.dob?.trim() || null,
        college: body.college?.trim() || null,
        course: body.course?.trim() || null,
        passingYear: body.passingYear ? parseInt(body.passingYear, 10) : null,
        specialization: body.specialization?.trim() || null,
        class10Percentage: body.class10Percentage ? parseFloat(body.class10Percentage) : null,
        class12Percentage: body.class12Percentage ? parseFloat(body.class12Percentage) : null,
        graduationCGPA: body.graduationCGPA ? parseFloat(body.graduationCGPA) : null,
        atsScore: body.atsScore !== '' && body.atsScore !== null && body.atsScore !== undefined ? parseFloat(body.atsScore) : null,
        cfRating: body.cfRating !== '' && body.cfRating !== null && body.cfRating !== undefined ? parseFloat(body.cfRating) : null,
        leetcodeRating: body.leetcodeRating !== '' && body.leetcodeRating !== null && body.leetcodeRating !== undefined ? parseFloat(body.leetcodeRating) : null,
        codechefRating: body.codechefRating !== '' && body.codechefRating !== null && body.codechefRating !== undefined ? parseFloat(body.codechefRating) : null,
        hackerRankUsername: body.hackerRankUsername?.trim() || null,
        activeBacklogs: Boolean(body.activeBacklogs),
        activeBacklogsRaw: body.activeBacklogsRaw || (body.activeBacklogs ? 'Yes' : 'No'),
        resumeUrl: body.resumeUrl?.trim() || null,
        stage: body.stage?.trim() || 'New',
      },
    });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
