import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getGoals, createGoal, getGoalCategories } from '@/lib/db/goals';
import type { GoalFilters, GoalSortOptions, PaginationParams } from '@/types';

// Validation schemas
const goalTypeSchema = z.enum(['long-term', 'short-term']);
const goalStatusSchema = z.enum(['active', 'completed', 'paused', 'abandoned']);
const sortFieldSchema = z.enum([
  'title',
  'created_at',
  'updated_at',
  'target_date',
  'progress_percentage',
]);
const sortDirSchema = z.enum(['asc', 'desc']);

// Accepts YYYY-MM-DD format for Supabase date columns
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)');

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  type: goalTypeSchema,
  category: z.string().max(50).nullable().optional(),
  targetDate: dateOnlySchema.nullable().optional(),
  status: goalStatusSchema.optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
});

/**
 * GET /api/goals - List goals with filters/sort/pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: GoalFilters = {};
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (type && goalTypeSchema.safeParse(type).success) {
      filters.type = type as GoalFilters['type'];
    }
    if (status && goalStatusSchema.safeParse(status).success) {
      filters.status = status as GoalFilters['status'];
    }
    if (category) filters.category = category;
    if (search) filters.search = search;

    // Parse sort
    let sort: GoalSortOptions | undefined;
    const sortField = searchParams.get('sortField');
    const sortDir = searchParams.get('sortDir');
    if (sortField && sortFieldSchema.safeParse(sortField).success) {
      sort = {
        field: sortField as GoalSortOptions['field'],
        direction:
          sortDirSchema.safeParse(sortDir).success
            ? (sortDir as 'asc' | 'desc')
            : 'desc',
      };
    }

    // Parse pagination
    const pagination: PaginationParams = {
      page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1),
      pageSize: Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10) || 10)
      ),
    };

    const result = await getGoals(supabase, user.id, { filters, sort, pagination });

    const totalPages = Math.ceil(result.totalCount / (pagination.pageSize ?? 10));

    return NextResponse.json({
      success: true,
      data: result.goals,
      pagination: {
        page: pagination.page ?? 1,
        pageSize: pagination.pageSize ?? 10,
        totalCount: result.totalCount,
        totalPages,
        hasNext: (pagination.page ?? 1) < totalPages,
        hasPrev: (pagination.page ?? 1) > 1,
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/goals error:', error);
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
 * POST /api/goals - Create new goal
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
    const parsed = createGoalSchema.safeParse(body);

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

    const goal = await createGoal(supabase, user.id, parsed.data);

    return NextResponse.json(
      { success: true, data: goal, error: null },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/goals error:', error);
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
