/**
 * Goals database query functions
 * All functions return domain models (camelCase)
 */

import { and, eq, or, ilike, isNull, isNotNull, gte, lte, asc, desc, count } from 'drizzle-orm';
import { db } from '@/db';
import { goals } from '@/db/schema';
import { mapGoal } from '@/db/mappers';
import type {
  Goal,
  GoalFilters,
  GoalSortOptions,
  CreateGoalInput,
  UpdateGoalInput,
  PaginationParams,
} from '@/types';
import { GoalLinkValidationError, GOAL_LINK_ERROR_CODES } from '@/types';

export interface GoalsQueryResult {
  goals: Goal[];
  totalCount: number;
}

export interface GetGoalsOptions {
  filters?: GoalFilters;
  sort?: GoalSortOptions;
  pagination?: PaginationParams;
}

// Map sort field (snake_case API contract) -> Drizzle column
const GOAL_SORT_COLUMNS = {
  title: goals.title,
  created_at: goals.createdAt,
  updated_at: goals.updatedAt,
  target_date: goals.targetDate,
  progress_percentage: goals.progressPercentage,
} as const;

/**
 * Get goals for a user with optional filtering, sorting, pagination
 */
export async function getGoals(
  userId: string,
  options: GetGoalsOptions = {}
): Promise<GoalsQueryResult> {
  const { filters, sort, pagination } = options;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(goals.userId, userId)];

  if (filters?.type) {
    conditions.push(eq(goals.type, filters.type));
  }
  if (filters?.status) {
    conditions.push(eq(goals.status, filters.status));
  }
  if (filters?.category) {
    conditions.push(eq(goals.category, filters.category));
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(goals.title, `%${filters.search}%`),
        ilike(goals.description, `%${filters.search}%`)
      )!
    );
  }
  if (filters?.parentGoalId !== undefined) {
    if (filters.parentGoalId === null) {
      conditions.push(isNull(goals.parentGoalId));
    } else {
      conditions.push(eq(goals.parentGoalId, filters.parentGoalId));
    }
  }
  if (filters?.hasParent !== undefined) {
    conditions.push(
      filters.hasParent ? isNotNull(goals.parentGoalId) : isNull(goals.parentGoalId)
    );
  }

  const where = and(...conditions);

  const sortField = sort?.field ?? 'created_at';
  const sortDir = sort?.direction ?? 'desc';
  const sortCol = GOAL_SORT_COLUMNS[sortField] ?? goals.createdAt;
  const orderBy = sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

  const [rows, countRows] = await Promise.all([
    db.select().from(goals).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
    db.select({ c: count() }).from(goals).where(where),
  ]);

  return {
    goals: rows.map(mapGoal),
    totalCount: countRows[0]?.c ?? 0,
  };
}

/**
 * Get single goal by ID (validates user ownership)
 */
export async function getGoalById(id: string, userId: string): Promise<Goal | null> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .limit(1);

  return rows[0] ? mapGoal(rows[0]) : null;
}

/**
 * Create new goal
 */
export async function createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
  const rows = await db
    .insert(goals)
    .values({
      userId,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      category: input.category ?? null,
      targetDate: input.targetDate ?? null,
      status: input.status ?? 'active',
      progressPercentage: input.progressPercentage ?? 0,
      parentGoalId: input.parentGoalId ?? null,
    })
    .returning();

  return mapGoal(rows[0]);
}

/**
 * Update existing goal (validates user ownership)
 */
export async function updateGoal(
  id: string,
  userId: string,
  input: UpdateGoalInput
): Promise<Goal | null> {
  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.targetDate !== undefined) updateData.targetDate = input.targetDate;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.progressPercentage !== undefined) {
    updateData.progressPercentage = input.progressPercentage;
  }
  if (input.parentGoalId !== undefined) {
    updateData.parentGoalId = input.parentGoalId;
  }

  // updated_at maintained by DB trigger; nothing to update -> return current
  if (Object.keys(updateData).length === 0) {
    return getGoalById(id, userId);
  }

  const rows = await db
    .update(goals)
    .set(updateData)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();

  return rows[0] ? mapGoal(rows[0]) : null;
}

/**
 * Delete goal (hard delete, validates user ownership)
 */
export async function deleteGoal(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning({ id: goals.id });

  return rows.length > 0;
}

/**
 * Get unique categories for a user (for filter dropdowns)
 */
export async function getGoalCategories(userId: string): Promise<string[]> {
  const rows = await db
    .select({ category: goals.category })
    .from(goals)
    .where(and(eq(goals.userId, userId), isNotNull(goals.category)));

  const categories = new Set<string>();
  for (const row of rows) {
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
  parentGoalId: string,
  userId: string
): Promise<Goal[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.parentGoalId, parentGoalId), eq(goals.userId, userId)))
    .orderBy(desc(goals.createdAt));

  return rows.map(mapGoal);
}

/**
 * Get goal with its parent goal (if any)
 */
export async function getGoalWithParent(
  id: string,
  userId: string
): Promise<{ goal: Goal; parentGoal: Goal | null } | null> {
  const goal = await getGoalById(id, userId);
  if (!goal) return null;

  let parentGoal: Goal | null = null;
  if (goal.parentGoalId) {
    parentGoal = await getGoalById(goal.parentGoalId, userId);
  }

  return { goal, parentGoal };
}

/**
 * Get goal with its child goals
 */
export async function getGoalWithChildren(
  id: string,
  userId: string
): Promise<{ goal: Goal; childGoals: Goal[] } | null> {
  const goal = await getGoalById(id, userId);
  if (!goal) return null;

  // Only long-term goals can have children
  let childGoals: Goal[] = [];
  if (goal.type === 'long-term') {
    childGoals = await getChildGoals(id, userId);
  }

  return { goal, childGoals };
}

/**
 * Link short-term goal to long-term goal
 * Returns updated goal or throws GoalLinkValidationError with error code
 */
export async function linkGoalToParent(
  shortTermGoalId: string,
  longTermGoalId: string,
  userId: string
): Promise<Goal> {
  // Validate short-term goal exists
  const shortTermGoal = await getGoalById(shortTermGoalId, userId);
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
  const children = await getChildGoals(shortTermGoalId, userId);
  if (children.length > 0) {
    throw new GoalLinkValidationError(
      GOAL_LINK_ERROR_CODES.GOAL_HAS_CHILDREN,
      'Cannot link goal that has children'
    );
  }

  // Validate long-term goal exists
  const longTermGoal = await getGoalById(longTermGoalId, userId);
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
  const updated = await updateGoal(shortTermGoalId, userId, {
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
  shortTermGoalId: string,
  userId: string
): Promise<Goal> {
  const goal = await getGoalById(shortTermGoalId, userId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  const updated = await updateGoal(shortTermGoalId, userId, {
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
export async function getLongTermGoals(userId: string): Promise<Goal[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.type, 'long-term'),
        eq(goals.status, 'active')
      )
    )
    .orderBy(asc(goals.title));

  return rows.map(mapGoal);
}

/**
 * Get short-term goals with target_date within a date range
 * Used by dashboard to show goals due in the current week/month
 */
export async function getGoalsByDeadline(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Goal[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.type, 'short-term'),
        isNotNull(goals.targetDate),
        gte(goals.targetDate, startDate),
        lte(goals.targetDate, endDate)
      )
    )
    .orderBy(asc(goals.targetDate));

  return rows.map(mapGoal);
}
