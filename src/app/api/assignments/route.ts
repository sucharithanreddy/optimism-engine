import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET assignments
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ assignments: [] });
    }

    let assignments;
    if (user.role === 'therapist') {
      // Therapist sees assignments they created
      assignments = await db.assignment.findMany({
        where: { therapistId: user.id },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Client sees their assigned tasks
      assignments = await db.assignment.findMany({
        where: { clientId: user.id },
        include: {
          therapist: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

// POST create assignment (therapist only)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== 'therapist') {
      return NextResponse.json({ error: 'Only therapists can create assignments' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, title, description, dueDate, therapistNotes } = body;

    if (!clientId || !title) {
      return NextResponse.json({ error: 'Client ID and title required' }, { status: 400 });
    }

    const assignment = await db.assignment.create({
      data: {
        therapistId: user.id,
        clientId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        therapistNotes,
      },
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}

// PUT update assignment status
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, status, clientResponse } = body;

    const assignment = await db.assignment.update({
      where: { id },
      data: {
        status,
        clientResponse,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}
