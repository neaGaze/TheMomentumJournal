import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getJournalHeatMapData, type Timeline } from '@/lib/db/dashboard';

const timelineSchema = z.enum(['week', 'month', 'year']);

/**
 * GET /api/dashboard/heatmap - Get journal heat map data
 * Query params:
 *   - timeline: 'week' | 'month' | 'year' (default: 'month')
 *
 * Response:
 *   - data: Array of { date, count, hasGoalMention }
 *   - totalEntries: Total journal entries in range
 *   - daysWithEntries: Number of unique days with entries
 *   - maxCount: Maximum entries on any single day
 *
 * Auth: Supports both cookie-based (web) and Bearer token (iOS) authentication
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const searchParams = request.nextUrl.searchParams;

    // Parse timeline (default to month for heatmap)
    const timelineParam = searchParams.get('timeline') ?? 'month';
    const timelineResult = timelineSchema.safeParse(timelineParam);
    const timeline: Timeline = timelineResult.success ? timelineResult.data : 'month';

    const result = await getJournalHeatMapData(userId, timeline);

    return NextResponse.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    console.error('GET /api/dashboard/heatmap error:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
