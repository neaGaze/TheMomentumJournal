import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getGoalById, updateGoal, deleteGoal } from '@/lib/db/goals';
import { GOAL_LINK_ERROR_CODES } from '@/types';

// Validation schemas
const goalTypeSchema = z.enum(['long-term', 'short-term']);
const goalStatusSchema = z.enum(['active', 'completed', 'paused', 'abandoned']);

// Accepts YYYY-MM-DD format for Supabase date columns
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)');

const updateGoalSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    type: goalTypeSchema.optional(),
    category: z.string().max(50).nullable().optional(),
    targetDate: dateOnlySchema.nullable().optional(),
    status: goalStatusSchema.optional(),
    progressPercentage: z.number().min(0).max(100).optional(),
    parentGoalId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required',
  })
  .refine(
    (data) => {
      // When updating type to long-term, parent must be null or not present
      if (data.type === 'long-term' && data.parentGoalId !== undefined && data.parentGoalId !== null) {
        return false;
      }
      return true;
    },
    { message: 'Long-term goals cannot have a parent goal' }
  );

const uuidSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/goals/[id] - Get single goal
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const goal = await getGoalById(supabase, id, user.id);

    if (!goal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Goal not found', status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: goal, error: null });
  } catch (error) {
    console.error('GET /api/goals/[id] error:', error);
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
 * PATCH /api/goals/[id] - Update goal
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Invalid goal ID', status: 400 } },
        { status: 400 }
      );
    }

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
    const parsed = updateGoalSchema.safeParse(body);

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

    // Prevent type change from short-term to long-term if goal has parent
    if (parsed.data.type === 'long-term') {
      const existingGoal = await getGoalById(supabase, id, user.id);
      if (existingGoal?.parentGoalId) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              message: 'Cannot change type to long-term while goal has a parent. Unlink first.',
              code: GOAL_LINK_ERROR_CODES.TYPE_CHANGE_BLOCKED,
              status: 400,
            },
          },
          { status: 400 }
        );
      }
    }

    const goal = await updateGoal(supabase, id, user.id, parsed.data);

    if (!goal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Goal not found', status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: goal, error: null });
  } catch (error) {
    console.error('PATCH /api/goals/[id] error:', error);
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
 * DELETE /api/goals/[id] - Delete goal
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const deleted = await deleteGoal(supabase, id, user.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Goal not found', status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: { id }, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/goals/[id] error:', error);
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
