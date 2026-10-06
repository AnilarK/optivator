import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { comment } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment text cannot be empty' },
        { status: 400 }
      );
    }

    const existing = await prisma.comment.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.comment.update({
      where: { id: params.id },
      data: {
        comment: comment.trim(),
      },
    });

    return NextResponse.json({ success: true, comment: updated });
  } catch (error) {
    console.error('Error in PATCH /api/comments/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const existing = await prisma.comment.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    await prisma.comment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/comments/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
