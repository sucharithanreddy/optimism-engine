import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET all sessions for the current user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ sessions: [] });
    }

    const sessions = await db.session.findMany({
      where: { userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST create a new session
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, firstThought } = body;

    // Find or create user
    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      // Get user info from Clerk
      const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });

      const userData = await userResponse.json();
      const email = userData.email_addresses?.[0]?.email_address || `${userId}@placeholder.com`;
      const name = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'User';
      const avatarUrl = userData.image_url;

      user = await db.user.create({
        data: {
          clerkId: userId,
          email,
          name,
          avatarUrl,
        },
      });
    }

    const session = await db.session.create({
      data: {
        userId: user.id,
        title: title || firstThought?.slice(0, 50) || 'New Session',
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
