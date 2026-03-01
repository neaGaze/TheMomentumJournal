import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getGoalsByDeadline } from '@/lib/db/goals';
import type { Timeline } from '@/lib/db/dashboard';

const timelineSchema = z.enum(['week', 'month', 'year']);

/**
 * Get date range for deadline filtering
 * Week: current ISO week (Mon-Sun)
 * Month: current calendar month
 */
function getDeadlineDateRange(timeline: Timeline): { startDate: string; endDate: string } {
  const now = new Date();

  switch (timeline) {
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        startDate: weekStart.toLocaleDateString('en-CA'),
        endDate: weekEnd.toLocaleDateString('en-CA'),
      };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: monthStart.toLocaleDateString('en-CA'),
        endDate: monthEnd.toLocaleDateString('en-CA'),
      };
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: yearStart.toLocaleDateString('en-CA'),
        endDate: yearEnd.toLocaleDateString('en-CA'),
      };
    }
  }
}

/**
 * GET /api/dashboard/deadline-goals
 * Returns short-term goals whose target_date falls within the selected timeline
 * Query params: timeline ('week' | 'month' | 'year')
 */
export async function GET(request: NextRequest) {
  try {
    let supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // Bearer token fallback (iOS)
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
    const timelineParam = searchParams.get('timeline') ?? 'week';
    const timelineResult = timelineSchema.safeParse(timelineParam);
    const timeline: Timeline = timelineResult.success ? timelineResult.data : 'week';

    const { startDate, endDate } = getDeadlineDateRange(timeline);
    const goals = await getGoalsByDeadline(supabase, user.id, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        startDate,
        endDate,
        goals,
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/dashboard/deadline-goals error:', error);
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
