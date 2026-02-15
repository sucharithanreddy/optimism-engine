import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET all gratitude entries
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ entries: [] });
    }

    const entries = await db.gratitudeEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get category stats
    const categoryCounts: Record<string, number> = {};
    entries.forEach(entry => {
      if (entry.category) {
        categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
      }
    });

    return NextResponse.json({
      entries,
      stats: {
        totalEntries: entries.length,
        categories: Object.entries(categoryCounts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
      },
    });
  } catch (error) {
    console.error('Error fetching gratitude entries:', error);
    return NextResponse.json({ error: 'Failed to fetch gratitude entries' }, { status: 500 });
  }
}

// POST create a gratitude entry
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, category } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@placeholder.com`,
        },
      });
    }

    const entry = await db.gratitudeEntry.create({
      data: {
        userId: user.id,
        content: content.trim(),
        category,
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error creating gratitude entry:', error);
    return NextResponse.json({ error: 'Failed to create gratitude entry' }, { status: 500 });
  }
}

// DELETE a gratitude entry
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.gratitudeEntry.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gratitude entry:', error);
    return NextResponse.json({ error: 'Failed to delete gratitude entry' }, { status: 500 });
  }
}
