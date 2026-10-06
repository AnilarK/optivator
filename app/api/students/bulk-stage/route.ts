import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidStage } from '@/lib/stages';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentIds, stage } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No student IDs provided' },
        { status: 400 }
      );
    }

    if (!stage || !isValidStage(stage)) {
      return NextResponse.json(
        { success: false, error: `Invalid stage: ${stage}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingStudents = await tx.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, stage: true },
      });

      const changedStudents = existingStudents.filter((student) => student.stage !== stage);

      const updateResult = await tx.student.updateMany({
        where: { id: { in: studentIds } },
        data: { stage },
      });

      await Promise.all(
        changedStudents.map((student) =>
          tx.comment.create({
            data: {
              studentId: student.id,
              comment: `Stage changed from ${student.stage} to ${stage}.`,
            },
          })
        )
      );

      return updateResult;
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Updated ${result.count} students to ${stage}`,
    });
  } catch (error) {
    console.error('Error in PATCH /api/students/bulk-stage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform bulk stage update' },
      { status: 500 }
    );
  }
}
