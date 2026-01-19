import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getDashboardStats, type Timeline } from '@/lib/db/dashboard';

const timelineSchema = z.enum(['week', 'month', 'year']);

/**
 * GET /api/dashboard/stats - Get combined dashboard statistics
 * Query params:
 *   - timeline: 'week' | 'month' | 'year' (default: 'week')
 *   - limit: number (for recent activity, default: 10, max: 50)
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

    // Parse activity limit
    const limitParam = searchParams.get('limit');
    const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? '10', 10) || 10));

    const stats = await getDashboardStats(supabase, user.id, timeline, limit);

    return NextResponse.json({
      success: true,
      data: stats,
      error: null,
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
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
