import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAnalyses, type AnalysisFilters } from '@/lib/db/ai';
import type { PaginationParams } from '@/types';

const analysisTypeSchema = z.enum(['on-demand', 'weekly', 'monthly']);

/**
 * GET /api/ai/analyses
 * List stored AI analyses with pagination and filters
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: AnalysisFilters = {};
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (type && analysisTypeSchema.safeParse(type).success) {
      filters.type = type as AnalysisFilters['type'];
    }
    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }
    if (dateTo) {
      filters.dateTo = dateTo;
    }

    // Parse pagination (support both pageSize and limit params)
    const pageSizeParam = searchParams.get('pageSize') ?? searchParams.get('limit') ?? '10';
    const pagination: PaginationParams = {
      page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1),
      pageSize: Math.min(
        50,
        Math.max(1, parseInt(pageSizeParam, 10) || 10)
      ),
    };

    const result = await getAnalyses(supabase, user.id, filters, pagination);

    const totalPages = Math.ceil(result.totalCount / (pagination.pageSize ?? 10));

    return NextResponse.json({
      success: true,
      data: result.analyses,
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
    console.error('GET /api/ai/analyses error:', error);
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
