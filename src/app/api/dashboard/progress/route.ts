import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getGoalsProgressOverTime, type Timeline } from '@/lib/db/dashboard';

const timelineSchema = z.enum(['week', 'month', 'year']);

/**
 * GET /api/dashboard/progress - Get time series progress data for charts
 * Query params:
 *   - timeline: 'week' | 'month' | 'year' (default: 'week')
 *
 * Returns array of data points grouped by:
 *   - week: daily points (7 points)
 *   - month: weekly points (4-5 points)
 *   - year: monthly points (12 points)
 *
 * Each point contains:
 *   - date: YYYY-MM-DD
 *   - completedGoals: cumulative completed goals
 *   - activeGoals: active goals at that point
 *   - journalEntries: entries in that interval
 *   - avgProgress: average goal progress percentage
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse timeline (default to week)
    const timelineParam = searchParams.get('timeline') ?? 'week';
    const timelineResult = timelineSchema.safeParse(timelineParam);
    const timeline: Timeline = timelineResult.success ? timelineResult.data : 'week';

    const progress = await getGoalsProgressOverTime(supabase, user.id, timeline);

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        points: progress,
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/dashboard/progress error:', error);
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
