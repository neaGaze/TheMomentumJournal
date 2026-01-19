/**
 * Goals database query functions
 * All functions return domain models (camelCase)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GoalRow } from '@/types/database.types';
import type {
  Goal,
  GoalFilters,
  GoalSortOptions,
  CreateGoalInput,
  UpdateGoalInput,
  PaginationParams,
} from '@/types';
import { mapGoalFromRow as mapGoal } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

export interface GoalsQueryResult {
  goals: Goal[];
  totalCount: number;
}

export interface GetGoalsOptions {
  filters?: GoalFilters;
  sort?: GoalSortOptions;
  pagination?: PaginationParams;
}

/**
 * Get goals for a user with optional filtering, sorting, pagination
 */
export async function getGoals(
  supabase: SupabaseClientAny,
  userId: string,
  options: GetGoalsOptions = {}
): Promise<GoalsQueryResult> {
  const { filters, sort, pagination } = options;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('goals')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Apply filters
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortField = sort?.field ?? 'created_at';
  const sortDir = sort?.direction ?? 'desc';
  query = query.order(sortField, { ascending: sortDir === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch goals: ${error.message}`);
  }

  return {
    goals: (data ?? []).map(mapGoal),
    totalCount: count ?? 0,
  };
}

/**
 * Get single goal by ID (validates user ownership)
 */
export async function getGoalById(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch goal: ${error.message}`);
  }

  return data ? mapGoal(data) : null;
}

/**
 * Create new goal
 */
export async function createGoal(
  supabase: SupabaseClientAny,
  userId: string,
  input: CreateGoalInput
): Promise<Goal> {
  const insertData = {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    type: input.type,
    category: input.category ?? null,
    target_date: input.targetDate ?? null,
    status: input.status ?? 'active',
    progress_percentage: input.progressPercentage ?? 0,
  };

  const { data, error } = await supabase
    .from('goals')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`);
  }

  return mapGoal(data);
}

/**
 * Update existing goal (validates user ownership)
 */
export async function updateGoal(
  supabase: SupabaseClientAny,
  id: string,
  userId: string,
  input: UpdateGoalInput
): Promise<Goal | null> {
  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.targetDate !== undefined) updateData.target_date = input.targetDate;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.progressPercentage !== undefined) {
    updateData.progress_percentage = input.progressPercentage;
  }

  // Always update timestamp
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found or no permission
    }
    throw new Error(`Failed to update goal: ${error.message}`);
  }

  return data ? mapGoal(data) : null;
}

/**
 * Delete goal (hard delete, validates user ownership)
 */
export async function deleteGoal(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<boolean> {
  const { error, count } = await supabase
    .from('goals')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete goal: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Get unique categories for a user (for filter dropdowns)
 */
export async function getGoalCategories(
  supabase: SupabaseClientAny,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('category')
    .eq('user_id', userId)
    .not('category', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  const categories = new Set<string>();
  for (const row of data ?? []) {
    if (row.category) {
      categories.add(row.category);
    }
  }

  return Array.from(categories).sort();
}
