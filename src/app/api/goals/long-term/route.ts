import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLongTermGoals } from '@/lib/db/goals';

/**
 * GET /api/goals/long-term - Get all active long-term goals for linking
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const goals = await getLongTermGoals(supabase, user.id);

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
