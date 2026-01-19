import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getJournalWithGoals,
  updateJournalEntryWithGoals,
  deleteJournalEntry,
} from '@/lib/db/journals';

// Validation schemas
const moodSchema = z.enum(['great', 'good', 'neutral', 'bad', 'terrible']);

// Accepts YYYY-MM-DD format
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)');

const updateJournalSchema = z
  .object({
    title: z.string().max(200).nullable().optional(),
    content: z.string().min(1).max(50000).optional(),
    entryDate: dateOnlySchema.optional(),
    mood: moodSchema.nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    goalIds: z.array(z.string().uuid()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required',
  });

const uuidSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/journals/[id] - Get single journal entry with goals
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Invalid journal ID', status: 400 } },
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

    const journal = await getJournalWithGoals(supabase, id, user.id);

    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal not found', status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: journal, error: null });
  } catch (error) {
    console.error('GET /api/journals/[id] error:', error);
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
 * PATCH /api/journals/[id] - Update journal entry
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Invalid journal ID', status: 400 } },
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
    const parsed = updateJournalSchema.safeParse(body);

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

    const journal = await updateJournalEntryWithGoals(supabase, id, user.id, parsed.data);

    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal not found', status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: journal, error: null });
  } catch (error) {
    console.error('PATCH /api/journals/[id] error:', error);
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
 * DELETE /api/journals/[id] - Delete journal entry
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Invalid journal ID', status: 400 } },
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

    const deleted = await deleteJournalEntry(supabase, id, user.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal not found', status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: { id }, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/journals/[id] error:', error);
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
