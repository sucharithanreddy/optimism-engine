import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET all mood entries for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ entries: [] });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await db.moodEntry.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const avgMood = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.mood, 0) / entries.length
      : 0;

    // Get emotion frequency
    const emotionCounts: Record<string, number> = {};
    entries.forEach(entry => {
      if (entry.emotions) {
        try {
          const emotions = JSON.parse(entry.emotions);
          emotions.forEach((e: string) => {
            emotionCounts[e] = (emotionCounts[e] || 0) + 1;
          });
        } catch {}
      }
    });

    return NextResponse.json({
      entries,
      stats: {
        averageMood: Math.round(avgMood * 10) / 10,
        totalEntries: entries.length,
        emotionFrequency: Object.entries(emotionCounts)
          .map(([emotion, count]) => ({ emotion, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching mood entries:', error);
    return NextResponse.json({ error: 'Failed to fetch mood entries' }, { status: 500 });
  }
}

// POST create a new mood entry
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mood, emotions, notes, triggers } = body;

    if (!mood || mood < 1 || mood > 10) {
      return NextResponse.json({ error: 'Mood must be between 1 and 10' }, { status: 400 });
    }

    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      // Create user if doesn't exist
      user = await db.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@placeholder.com`,
        },
      });
    }

    const entry = await db.moodEntry.create({
      data: {
        userId: user.id,
        mood,
        emotions: emotions ? JSON.stringify(emotions) : null,
        notes,
        triggers,
      },
    });

    // Check for crisis indicators
    const crisisKeywords = ['suicide', 'kill myself', 'want to die', 'end it all', 'hopeless', 'no point'];
    const combinedText = `${notes || ''} ${triggers || ''}`.toLowerCase();
    const hasCrisisKeyword = crisisKeywords.some(keyword => combinedText.includes(keyword));

    if (hasCrisisKeyword || mood <= 2) {
      // Create crisis alert
      const therapists = await db.user.findMany({
        where: { role: 'therapist' },
      });

      if (therapists.length > 0) {
        await db.crisisAlert.create({
          data: {
            clientId: user.id,
            therapistId: therapists[0].id,
            triggerPhrase: mood <= 2 ? `Low mood score: ${mood}` : 'Crisis keyword detected',
            severity: mood <= 2 ? 'high' : 'moderate',
          },
        });
      }
    }

    return NextResponse.json({ entry, crisisAlert: hasCrisisKeyword || mood <= 2 });
  } catch (error) {
    console.error('Error creating mood entry:', error);
    return NextResponse.json({ error: 'Failed to create mood entry' }, { status: 500 });
  }
}
