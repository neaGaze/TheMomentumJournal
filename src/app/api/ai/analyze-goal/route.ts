import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getContextForGoalAnalysis, saveAnalysis } from '@/lib/db/ai';
import { analyzeGoalProgress, ClaudeAPIError } from '@/lib/claude/client';

const requestSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID'),
});

/**
 * POST /api/ai/analyze-goal
 * Analyze a specific goal's progress using Claude
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
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'Validation failed',
            status: 400,
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { goalId } = parsed.data;

    // Fetch context for analysis
    const context = await getContextForGoalAnalysis(supabase, goalId, user.id);

    if (!context) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { message: 'Goal not found', status: 404 },
        },
        { status: 404 }
      );
    }

    // Call Claude for analysis
    const result = await analyzeGoalProgress(context.goal, context.relatedJournals);

    // Save analysis to database
    const savedAnalysis = await saveAnalysis(supabase, user.id, 'on-demand', {
      journalEntriesAnalyzed: context.relatedJournals.map(j => j.id),
      goalsAnalyzed: [goalId],
      insights: result.insights,
      recommendations: result.recommendations,
      progressSummary: result.progressSummary,
      tokensUsed: result.tokensUsed,
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: savedAnalysis,
        goal: context.goal,
        relatedJournalsCount: context.relatedJournals.length,
      },
      error: null,
    });
  } catch (error) {
    console.error('POST /api/ai/analyze-goal error:', error);

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
            message: 'AI analysis failed. Please try again.',
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
