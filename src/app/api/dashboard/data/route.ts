import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get all users with their sessions and messages
    const users = await db.user.findMany({
      include: {
        sessions: {
          include: {
            messages: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const totalUsers = users.length;
    const allSessions = users.flatMap((u) => u.sessions);
    const totalSessions = allSessions.length;
    const totalMessages = allSessions.flatMap((s) => s.messages).length;
    const completedSessions = allSessions.filter((s) => s.isCompleted).length;

    // Get common distortions
    const distortionCounts: Record<string, number> = {};
    allSessions.forEach((session) => {
      session.messages.forEach((msg) => {
        if (msg.distortionType) {
          distortionCounts[msg.distortionType] =
            (distortionCounts[msg.distortionType] || 0) + 1;
        }
      });
    });

    const commonDistortions = Object.entries(distortionCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate layer distribution
    const layerCounts: Record<string, number> = { surface: 0, trigger: 0, emotion: 0, coreBelief: 0 };
    allSessions.forEach((session) => {
      const layer = session.currentLayer || 'surface';
      if (layerCounts[layer] !== undefined) {
        layerCounts[layer]++;
      }
    });

    const layerOrder = ['surface', 'trigger', 'emotion', 'coreBelief'];
    const layerDistribution = layerOrder.map(layer => ({
      layer,
      count: layerCounts[layer],
      percentage: totalSessions > 0 ? Math.round((layerCounts[layer] / totalSessions) * 100) : 0,
    }));

    // Calculate average session depth (0-3 scale)
    const layerDepth: Record<string, number> = { surface: 0, trigger: 1, emotion: 2, coreBelief: 3 };
    const averageSessionDepth = totalSessions > 0
      ? allSessions.reduce((sum, s) => sum + (layerDepth[s.currentLayer] || 0), 0) / totalSessions
      : 0;

    // Get core beliefs discovered
    const recentCoreBeliefs = allSessions
      .filter(s => s.coreBelief)
      .map(s => s.coreBelief as string)
      .slice(0, 5);

    const coreBeliefsDiscovered = allSessions.filter(s => s.coreBelief).length;

    // Remove sensitive data from users
    const safeUsers = users.map((user) => ({
      ...user,
      email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    }));

    return NextResponse.json({
      users: safeUsers,
      stats: {
        totalUsers,
        totalSessions,
        totalMessages,
        completedSessions,
        commonDistortions,
        layerDistribution,
        coreBeliefsDiscovered,
        averageSessionDepth,
        recentCoreBeliefs,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
