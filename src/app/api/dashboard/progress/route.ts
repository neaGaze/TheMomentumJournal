import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
 *
 * Auth: Supports both cookie-based (web) and Bearer token (iOS) authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Try cookie-based auth first (web client)
    let supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // If no user from cookies, try Bearer token (iOS client)
    if (!user) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          }
        );
        const result = await supabase.auth.getUser(token);
        user = result.data.user;
      }
    }

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
