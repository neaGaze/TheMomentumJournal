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
import { mapGoalFromRow as mapGoal, GoalLinkValidationError, GOAL_LINK_ERROR_CODES } from '@/types';

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
  if (filters?.parentGoalId !== undefined) {
    if (filters.parentGoalId === null) {
      query = query.is('parent_goal_id', null);
    } else {
      query = query.eq('parent_goal_id', filters.parentGoalId);
    }
  }
  if (filters?.hasParent !== undefined) {
    if (filters.hasParent) {
      query = query.not('parent_goal_id', 'is', null);
    } else {
      query = query.is('parent_goal_id', null);
    }
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
    parent_goal_id: input.parentGoalId ?? null,
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
  if (input.parentGoalId !== undefined) {
    updateData.parent_goal_id = input.parentGoalId;
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

/**
 * Get child goals (short-term) for a long-term goal
 */
export async function getChildGoals(
  supabase: SupabaseClientAny,
  parentGoalId: string,
  userId: string
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('parent_goal_id', parentGoalId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch child goals: ${error.message}`);
  }

  return (data ?? []).map(mapGoal);
}

/**
 * Get goal with its parent goal (if any)
 */
export async function getGoalWithParent(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<{ goal: Goal; parentGoal: Goal | null } | null> {
  const goal = await getGoalById(supabase, id, userId);
  if (!goal) return null;

  let parentGoal: Goal | null = null;
  if (goal.parentGoalId) {
    parentGoal = await getGoalById(supabase, goal.parentGoalId, userId);
  }

  return { goal, parentGoal };
}

/**
 * Get goal with its child goals
 */
export async function getGoalWithChildren(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<{ goal: Goal; childGoals: Goal[] } | null> {
  const goal = await getGoalById(supabase, id, userId);
  if (!goal) return null;

  // Only long-term goals can have children
  let childGoals: Goal[] = [];
  if (goal.type === 'long-term') {
    childGoals = await getChildGoals(supabase, id, userId);
  }

  return { goal, childGoals };
}

/**
 * Link short-term goal to long-term goal
 * Returns updated goal or throws GoalLinkValidationError with error code
 */
export async function linkGoalToParent(
  supabase: SupabaseClientAny,
  shortTermGoalId: string,
  longTermGoalId: string,
  userId: string
): Promise<Goal> {
  // Validate short-term goal exists
  const shortTermGoal = await getGoalById(supabase, shortTermGoalId, userId);
  if (!shortTermGoal) {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.GOAL_NOT_FOUND,
      'Short-term goal not found'
    );
  }

  // Validate goal is short-term
  if (shortTermGoal.type !== 'short-term') {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.CHILD_NOT_SHORT_TERM,
      'Only short-term goals can be linked to a parent'
    );
  }

  // Check if already linked to same parent (Issue #2)
  if (shortTermGoal.parentGoalId === longTermGoalId) {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.ALREADY_LINKED,
      'Goal is already linked to this parent'
    );
  }

  // Check if goal has children (cannot be linked as child if it's a parent)
  const children = await getChildGoals(supabase, shortTermGoalId, userId);
  if (children.length > 0) {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.GOAL_HAS_CHILDREN,
      'Cannot link goal that has children'
    );
  }

  // Validate long-term goal exists
  const longTermGoal = await getGoalById(supabase, longTermGoalId, userId);
  if (!longTermGoal) {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.PARENT_NOT_FOUND,
      'Parent goal not found'
    );
  }

  // Explicit type validation (Issue #8)
  if (longTermGoal.type !== 'long-term') {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.PARENT_NOT_LONG_TERM,
      'Parent must be a long-term goal'
    );
  }

  // Update link
  const updated = await updateGoal(supabase, shortTermGoalId, userId, {
    parentGoalId: longTermGoalId,
  });

  if (!updated) {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.GOAL_NOT_FOUND,
      'Failed to link goals'
    );
  }

  return updated;
}

/**
 * Unlink short-term goal from its parent
 */
export async function unlinkGoalFromParent(
  supabase: SupabaseClientAny,
  shortTermGoalId: string,
  userId: string
): Promise<Goal> {
  const goal = await getGoalById(supabase, shortTermGoalId, userId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  const updated = await updateGoal(supabase, shortTermGoalId, userId, {
    parentGoalId: null,
  });

  if (!updated) {
    throw new Error('Failed to unlink goal');
  }

  return updated;
}

/**
 * Get all long-term goals (for linking dropdown)
 */
export async function getLongTermGoals(
  supabase: SupabaseClientAny,
  userId: string
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'long-term')
    .eq('status', 'active')
    .order('title', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch long-term goals: ${error.message}`);
  }

  return (data ?? []).map(mapGoal);
}
