import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { goals as goalsTable } from '@/db/schema';
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // Verify journal belongs to user
    const journal = await getJournalById(id, userId);
    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal entry not found', status: 404 } },
        { status: 404 }
      );
    }

    const goals = await getJournalGoals(id, userId);

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

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
    const journal = await getJournalById(id, userId);
    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal entry not found', status: 404 } },
        { status: 404 }
      );
    }

    // Verify all goals belong to user
    if (parsed.data.goalIds.length > 0) {
      const goals = await db
        .select({ id: goalsTable.id })
        .from(goalsTable)
        .where(and(inArray(goalsTable.id, parsed.data.goalIds), eq(goalsTable.userId, userId)));

      const validGoalIds = new Set(goals.map((g) => g.id));
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
    await unlinkJournalFromGoals(id);
    if (parsed.data.goalIds.length > 0) {
      await linkJournalToGoals(id, parsed.data.goalIds);
    }

    // Return updated goals
    const goals = await getJournalGoals(id, userId);

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // Verify journal belongs to user
    const journal = await getJournalById(id, userId);
    if (!journal) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Journal entry not found', status: 404 } },
        { status: 404 }
      );
    }

    await unlinkJournalFromGoals(id);

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
