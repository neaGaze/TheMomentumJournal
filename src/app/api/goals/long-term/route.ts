import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLongTermGoals } from '@/lib/db/goals';

/**
 * GET /api/goals/long-term - Get all active long-term goals for linking
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const goals = await getLongTermGoals(userId);

    return NextResponse.json({
      success: true,
      data: goals,
      error: null,
    });
  } catch (error) {
    console.error('GET /api/goals/long-term error:', error);
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
