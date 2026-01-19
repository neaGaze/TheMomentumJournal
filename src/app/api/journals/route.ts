import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getJournalEntriesWithGoals, createJournalEntryWithGoals } from '@/lib/db/journals';
import type { JournalFilters, JournalSortOptions, PaginationParams } from '@/types';

// Validation schemas
const moodSchema = z.enum(['great', 'good', 'neutral', 'bad', 'terrible']);
const sortFieldSchema = z.enum(['entry_date', 'created_at', 'updated_at', 'title']);
const sortDirSchema = z.enum(['asc', 'desc']);

// Accepts YYYY-MM-DD format
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)');

const createJournalSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(50000),
  entryDate: dateOnlySchema.optional(),
  mood: moodSchema.nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  goalIds: z.array(z.string().uuid()).optional(),
});

/**
 * GET /api/journals - List journals with filters/sort/pagination
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
    const filters: JournalFilters = {};
    const mood = searchParams.get('mood');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const goalId = searchParams.get('goalId');
    const tagsParam = searchParams.get('tags');

    if (mood && moodSchema.safeParse(mood).success) {
      filters.mood = mood as JournalFilters['mood'];
    }
    if (dateFrom && dateOnlySchema.safeParse(dateFrom).success) {
      filters.dateFrom = dateFrom;
    }
    if (dateTo && dateOnlySchema.safeParse(dateTo).success) {
      filters.dateTo = dateTo;
    }
    if (search) filters.search = search;
    if (goalId && z.string().uuid().safeParse(goalId).success) {
      filters.goalId = goalId;
    }
    if (tagsParam) {
      filters.tags = tagsParam.split(',').filter(Boolean);
    }

    // Parse sort
    let sort: JournalSortOptions | undefined;
    const sortField = searchParams.get('sortField');
    const sortDir = searchParams.get('sortDir');
    if (sortField && sortFieldSchema.safeParse(sortField).success) {
      sort = {
        field: sortField as JournalSortOptions['field'],
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

    const result = await getJournalEntriesWithGoals(supabase, user.id, { filters, sort, pagination });

    const totalPages = Math.ceil(result.totalCount / (pagination.pageSize ?? 10));

    return NextResponse.json({
      success: true,
      data: result.journals,
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
    console.error('GET /api/journals error:', error);
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
 * POST /api/journals - Create new journal entry
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
    const parsed = createJournalSchema.safeParse(body);

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

    const journal = await createJournalEntryWithGoals(supabase, user.id, parsed.data);

    return NextResponse.json(
      { success: true, data: journal, error: null },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/journals error:', error);
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
