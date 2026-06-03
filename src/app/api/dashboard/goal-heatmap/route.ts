import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getGoalActivityHeatMapData, type Timeline } from '@/lib/db/dashboard';

const timelineSchema = z.enum(['week', 'month', 'year']);

/**
 * GET /api/dashboard/goal-heatmap - Get goal activity heat map data
 * Query params:
 *   - timeline: 'week' | 'month' | 'year' (default: 'week')
 *
 * Response:
 *   - goals: Array of { id, title, color }
 *   - activityByGoal: Record<goalId, dates[]>
 *   - dateRange: { start, end }
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

    // Parse timeline (default to week for goal heatmap)
    const timelineParam = searchParams.get('timeline') ?? 'week';
    const timelineResult = timelineSchema.safeParse(timelineParam);
    const timeline: Timeline = timelineResult.success ? timelineResult.data : 'week';

    const result = await getGoalActivityHeatMapData(userId, timeline);

    return NextResponse.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    console.error('GET /api/dashboard/goal-heatmap error:', error);
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
