import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { generateCsvExport } from '@/lib/csv';
import { buildStudentWhere } from '@/lib/student-query';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const where = buildStudentWhere(searchParams);

    const orderBy: Prisma.StudentOrderByWithRelationInput = {};
    const validSortFields = ['fullName', 'graduationCGPA', 'passingYear', 'stage', 'updatedAt', 'createdAt'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy as keyof Prisma.StudentOrderByWithRelationInput] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

    const students = await prisma.student.findMany({
      where,
      orderBy,
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const csvOutput = generateCsvExport(students);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `students_export_${timestamp}.csv`;

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/export:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export students' },
      { status: 500 }
    );
  }
}
