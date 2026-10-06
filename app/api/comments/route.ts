import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, comment } = body;

    if (!studentId || !comment || !comment.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student ID and comment text are required' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const created = await prisma.comment.create({
      data: {
        studentId,
        comment: comment.trim(),
      },
    });

    return NextResponse.json({ success: true, comment: created }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
