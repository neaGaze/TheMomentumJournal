import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { linkGoalToParent, unlinkGoalFromParent, getGoalWithParent, getGoalWithChildren, getGoalById } from '@/lib/db/goals';
import { GoalLinkValidationError, GOAL_LINK_ERROR_CODES } from '@/types';

const uuidSchema = z.string().uuid();

const linkSchema = z.object({
  parentGoalId: z.string().uuid(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/goals/[id]/link - Get goal with parent/children
 * Returns parent if short-term, children if long-term
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Invalid goal ID', status: 400 } },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    // Try to get with parent first (works for short-term goals)
    const withParent = await getGoalWithParent(supabase, id, user.id);
    if (!withParent) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Goal not found', status: 404 } },
        { status: 404 }
      );
    }

    // If long-term goal, get children instead
    if (withParent.goal.type === 'long-term') {
      const withChildren = await getGoalWithChildren(supabase, id, user.id);
      return NextResponse.json({
        success: true,
        data: {
          goal: withChildren?.goal,
          parentGoal: null,
          childGoals: withChildren?.childGoals ?? [],
        },
        error: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        goal: withParent.goal,
        parentGoal: withParent.parentGoal,
        childGoals: [],
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/goals/[id]/link error:', error);
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
 * POST /api/goals/[id]/link - Link short-term goal to long-term goal
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Invalid goal ID', status: 400 } },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = linkSchema.safeParse(body);

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

    // Explicit parent type validation before linking (Issue #8)
    const parentGoal = await getGoalById(supabase, parsed.data.parentGoalId, user.id);
    if (!parentGoal) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'Parent goal not found',
            code: GOAL_LINK_ERROR_CODES.PARENT_NOT_FOUND,
            status: 404,
          },
        },
        { status: 404 }
      );
    }
    if (parentGoal.type !== 'long-term') {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'Parent must be a long-term goal',
            code: GOAL_LINK_ERROR_CODES.PARENT_NOT_LONG_TERM,
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    const goal = await linkGoalToParent(supabase, id, parsed.data.parentGoalId, user.id);

    return NextResponse.json({ success: true, data: goal, error: null });
  } catch (error) {
    console.error('POST /api/goals/[id]/link error:', error);

    // Structured error responses (Issue #6)
    if (error instanceof GoalLinkValidationError) {
      const status =
        error.code === GOAL_LINK_ERROR_CODES.GOAL_NOT_FOUND ||
        error.code === GOAL_LINK_ERROR_CODES.PARENT_NOT_FOUND
          ? 404
          : 400;
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { message: error.message, code: error.code, status },
        },
        { status }
      );
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, data: null, error: { message, status: 500 } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/[id]/link - Unlink short-term goal from parent
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Invalid goal ID', status: 400 } },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const goal = await unlinkGoalFromParent(supabase, id, user.id);

    return NextResponse.json({ success: true, data: goal, error: null });
  } catch (error) {
    console.error('DELETE /api/goals/[id]/link error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, data: null, error: { message, status } },
      { status }
    );
  }
}
