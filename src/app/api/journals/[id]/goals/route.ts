import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getJournalGoals,
  linkJournalToGoals,
  unlinkJournalFromGoals,
  getJournalById,
} from '@/lib/db/journals';

const linkGoalsSchema = z.object({
  goalIds: z.array(z.string().uuid()),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/journals/[id]/goals - Get goals linked to a journal entry
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Verify journal belongs to user
    const journal = await getJournalById(supabase, id, user.id);
    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal entry not found', status: 404 } },
        { status: 404 }
      );
    }

    const goals = await getJournalGoals(supabase, id, user.id);

    return NextResponse.json({ success: true, data: goals, error: null });
  } catch (error) {
    console.error('GET /api/journals/[id]/goals error:', error);
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
 * POST /api/journals/[id]/goals - Link goals to a journal entry (replaces existing links)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    const parsed = linkGoalsSchema.safeParse(body);

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

    // Verify journal belongs to user
    const journal = await getJournalById(supabase, id, user.id);
    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal entry not found', status: 404 } },
        { status: 404 }
      );
    }

    // Verify all goals belong to user
    if (parsed.data.goalIds.length > 0) {
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .in('id', parsed.data.goalIds)
        .eq('user_id', user.id);

      if (goalsError) {
        throw goalsError;
      }

      const validGoalIds = new Set((goals ?? []).map((g) => g.id));
      const invalidGoalIds = parsed.data.goalIds.filter((gid) => !validGoalIds.has(gid));

      if (invalidGoalIds.length > 0) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              message: `Invalid goal IDs: ${invalidGoalIds.join(', ')}`,
              status: 400,
            },
          },
          { status: 400 }
        );
      }
    }

    // Clear existing links and add new ones
    await unlinkJournalFromGoals(supabase, id);
    if (parsed.data.goalIds.length > 0) {
      await linkJournalToGoals(supabase, id, parsed.data.goalIds);
    }

    // Return updated goals
    const goals = await getJournalGoals(supabase, id, user.id);

    return NextResponse.json({ success: true, data: goals, error: null });
  } catch (error) {
    console.error('POST /api/journals/[id]/goals error:', error);
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
 * DELETE /api/journals/[id]/goals - Unlink all goals from a journal entry
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Verify journal belongs to user
    const journal = await getJournalById(supabase, id, user.id);
    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal entry not found', status: 404 } },
        { status: 404 }
      );
    }

    await unlinkJournalFromGoals(supabase, id);

    return NextResponse.json({ success: true, data: [], error: null });
  } catch (error) {
    console.error('DELETE /api/journals/[id]/goals error:', error);
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
