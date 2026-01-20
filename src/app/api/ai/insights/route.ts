import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getContextForWeeklyInsights,
  saveAnalysis,
  getCachedWeeklyInsight,
  getCachedMonthlyInsight,
} from '@/lib/db/ai';
import { generateWeeklyInsights, ClaudeAPIError } from '@/lib/claude/client';
import type { AnalysisType } from '@/types';

const timelineSchema = z.enum(['week', 'month']).default('week');

const postBodySchema = z.object({
  timeline: z.enum(['week', 'month']).optional(),
  analysisType: z.enum(['weekly', 'monthly']).optional(),
  refresh: z.boolean().optional().default(false),
});


/**
 * GET /api/ai/insights?timeline=week|month
 * Generate or fetch cached weekly/monthly insights
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
    const timelineParam = searchParams.get('timeline') ?? 'week';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const parsedTimeline = timelineSchema.safeParse(timelineParam);
    if (!parsedTimeline.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { message: 'Invalid timeline. Use "week" or "month".', status: 400 },
        },
        { status: 400 }
      );
    }

    const timeline = parsedTimeline.data;
    const analysisType: AnalysisType = timeline === 'week' ? 'weekly' : 'monthly';

    // Calculate period start date
    const now = new Date();
    const periodStartDate = new Date(now);
    if (timeline === 'week') {
      // Start of current week (Sunday)
      const dayOfWeek = now.getDay();
      periodStartDate.setDate(now.getDate() - dayOfWeek);
    } else {
      // Start of current month
      periodStartDate.setDate(1);
    }
    periodStartDate.setHours(0, 0, 0, 0);
    const periodStartStr = periodStartDate.toISOString();

    // Check for cached insight (unless refresh requested)
    if (!forceRefresh) {
      const cachedInsight = timeline === 'week'
        ? await getCachedWeeklyInsight(supabase, user.id, periodStartStr)
        : await getCachedMonthlyInsight(supabase, user.id, periodStartStr);

      if (cachedInsight) {
        return NextResponse.json({
          success: true,
          data: {
            analysis: cachedInsight,
            cached: true,
            timeline,
            periodStart: periodStartStr,
          },
          error: null,
        });
      }
    }

    // Fetch context for insights generation
    const context = await getContextForWeeklyInsights(supabase, user.id, timeline);

    // Generate insights using Claude
    const result = await generateWeeklyInsights(
      context.journals,
      context.goals,
      context.stats
    );

    // Save analysis to database
    const savedAnalysis = await saveAnalysis(supabase, user.id, analysisType, {
      journalEntriesAnalyzed: context.journals.map(j => j.id),
      goalsAnalyzed: context.goals.map(g => g.id),
      insights: {
        ...result.insights,
        summary: result.summary,
        key_achievements: result.keyAchievements,
        areas_for_improvement: result.areasForImprovement,
        goal_progress_updates: result.goalProgressUpdates,
      },
      recommendations: result.recommendations,
      progressSummary: {
        overall_progress: Math.round(
          context.goals.reduce((sum, g) => sum + g.progressPercentage, 0) /
          Math.max(1, context.goals.length)
        ),
        goals_on_track: context.goals
          .filter(g => g.status === 'active' && g.progressPercentage >= 50)
          .map(g => g.id),
        goals_behind: context.goals
          .filter(g => g.status === 'active' && g.progressPercentage < 50)
          .map(g => g.id),
        momentum_score: Math.min(100, context.stats.currentStreak * 10 + context.stats.journalCount * 5),
      },
      tokensUsed: result.tokensUsed,
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: savedAnalysis,
        summary: result.summary,
        keyAchievements: result.keyAchievements,
        areasForImprovement: result.areasForImprovement,
        goalProgressUpdates: result.goalProgressUpdates,
        stats: context.stats,
        cached: false,
        timeline,
        periodStart: periodStartStr,
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/ai/insights error:', error);

    // Handle Claude API specific errors
    if (error instanceof ClaudeAPIError) {
      if (error.isRateLimited) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              message: 'AI service rate limited. Please try again in a moment.',
              status: 429,
              code: 'RATE_LIMITED',
            },
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'AI insights generation failed. Please try again.',
            status: error.statusCode ?? 500,
            code: 'AI_ERROR',
          },
        },
        { status: error.statusCode ?? 500 }
      );
    }

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

/**
 * POST /api/ai/insights
 * Generate new insights (bypasses cache if refresh=true)
 * Body: { timeline?: 'week' | 'month', analysisType?: 'weekly' | 'monthly', refresh?: boolean }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = postBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { message: 'Invalid request body', status: 400 },
        },
        { status: 400 }
      );
    }

    const { timeline: timelineParam, analysisType: analysisTypeParam, refresh } = parsed.data;

    // Support both timeline and analysisType params for flexibility
    let timeline: 'week' | 'month' = 'week';
    if (timelineParam) {
      timeline = timelineParam;
    } else if (analysisTypeParam) {
      timeline = analysisTypeParam === 'weekly' ? 'week' : 'month';
    }

    const analysisType: AnalysisType = timeline === 'week' ? 'weekly' : 'monthly';

    // Calculate period start date
    const now = new Date();
    const periodStartDate = new Date(now);
    if (timeline === 'week') {
      const dayOfWeek = now.getDay();
      periodStartDate.setDate(now.getDate() - dayOfWeek);
    } else {
      periodStartDate.setDate(1);
    }
    periodStartDate.setHours(0, 0, 0, 0);
    const periodStartStr = periodStartDate.toISOString();

    // Check cache unless refresh requested (POST always generates, but we can still skip if recent)
    if (!refresh) {
      const cachedInsight = timeline === 'week'
        ? await getCachedWeeklyInsight(supabase, user.id, periodStartStr)
        : await getCachedMonthlyInsight(supabase, user.id, periodStartStr);

      if (cachedInsight) {
        return NextResponse.json({
          success: true,
          data: {
            analysis: cachedInsight,
            cached: true,
            timeline,
            periodStart: periodStartStr,
          },
          error: null,
        });
      }
    }

    // Fetch context for insights generation
    const context = await getContextForWeeklyInsights(supabase, user.id, timeline);

    // Generate insights using Claude
    const result = await generateWeeklyInsights(
      context.journals,
      context.goals,
      context.stats
    );

    // Save analysis to database
    const savedAnalysis = await saveAnalysis(supabase, user.id, analysisType, {
      journalEntriesAnalyzed: context.journals.map(j => j.id),
      goalsAnalyzed: context.goals.map(g => g.id),
      insights: {
        ...result.insights,
        summary: result.summary,
        key_achievements: result.keyAchievements,
        areas_for_improvement: result.areasForImprovement,
        goal_progress_updates: result.goalProgressUpdates,
      },
      recommendations: result.recommendations,
      progressSummary: {
        overall_progress: Math.round(
          context.goals.reduce((sum, g) => sum + g.progressPercentage, 0) /
          Math.max(1, context.goals.length)
        ),
        goals_on_track: context.goals
          .filter(g => g.status === 'active' && g.progressPercentage >= 50)
          .map(g => g.id),
        goals_behind: context.goals
          .filter(g => g.status === 'active' && g.progressPercentage < 50)
          .map(g => g.id),
        momentum_score: Math.min(100, context.stats.currentStreak * 10 + context.stats.journalCount * 5),
      },
      tokensUsed: result.tokensUsed,
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: savedAnalysis,
        summary: result.summary,
        keyAchievements: result.keyAchievements,
        areasForImprovement: result.areasForImprovement,
        goalProgressUpdates: result.goalProgressUpdates,
        stats: context.stats,
        cached: false,
        timeline,
        periodStart: periodStartStr,
      },
      error: null,
    });
  } catch (error) {
    console.error('POST /api/ai/insights error:', error);

    if (error instanceof ClaudeAPIError) {
      if (error.isRateLimited) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              message: 'AI service rate limited. Please try again in a moment.',
              status: 429,
              code: 'RATE_LIMITED',
            },
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'AI insights generation failed. Please try again.',
            status: error.statusCode ?? 500,
            code: 'AI_ERROR',
          },
        },
        { status: error.statusCode ?? 500 }
      );
    }

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
