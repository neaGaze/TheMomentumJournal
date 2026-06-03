/**
 * Journal database query functions
 * All functions return domain models (camelCase)
 */

import { and, eq, or, ilike, gte, lte, asc, desc, inArray, count, arrayOverlaps, sql } from 'drizzle-orm';
import { db } from '@/db';
import { journalEntries, journalGoalMentions, goals } from '@/db/schema';
import { mapJournalEntry as mapJournal, mapGoal } from '@/db/mappers';
import type {
  JournalEntry,
  JournalEntryWithGoals,
  JournalFilters,
  JournalSortOptions,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  PaginationParams,
  Goal,
} from '@/types';

export interface JournalsQueryResult {
  journals: JournalEntry[];
  totalCount: number;
}

export interface JournalsWithGoalsQueryResult {
  journals: JournalEntryWithGoals[];
  totalCount: number;
}

export interface GetJournalsOptions {
  filters?: JournalFilters;
  sort?: JournalSortOptions;
  pagination?: PaginationParams;
}

// Map sort field (snake_case API contract) -> Drizzle column
const JOURNAL_SORT_COLUMNS = {
  entry_date: journalEntries.entryDate,
  created_at: journalEntries.createdAt,
  updated_at: journalEntries.updatedAt,
  title: journalEntries.title,
} as const;

/**
 * Get journal entries for a user with optional filtering, sorting, pagination
 */
export async function getJournalEntries(
  userId: string,
  options: GetJournalsOptions = {}
): Promise<JournalsQueryResult> {
  const { filters, sort, pagination } = options;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(journalEntries.userId, userId)];

  if (filters?.mood) {
    conditions.push(eq(journalEntries.mood, filters.mood));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(journalEntries.entryDate, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(journalEntries.entryDate, filters.dateTo));
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(journalEntries.title, `%${filters.search}%`),
        ilike(journalEntries.content, `%${filters.search}%`)
      )!
    );
  }
  if (filters?.tags && filters.tags.length > 0) {
    conditions.push(arrayOverlaps(journalEntries.tags, filters.tags));
  }

  // Filter by goal mention - requires subquery
  if (filters?.goalId) {
    const mentionRows = await db
      .select({ journalEntryId: journalGoalMentions.journalEntryId })
      .from(journalGoalMentions)
      .where(eq(journalGoalMentions.goalId, filters.goalId));

    if (mentionRows.length > 0) {
      conditions.push(
        inArray(journalEntries.id, mentionRows.map((m) => m.journalEntryId))
      );
    } else {
      return { journals: [], totalCount: 0 };
    }
  }

  const where = and(...conditions);

  const sortField = sort?.field ?? 'entry_date';
  const sortDir = sort?.direction ?? 'desc';
  const sortCol = JOURNAL_SORT_COLUMNS[sortField] ?? journalEntries.entryDate;
  const orderBy = sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

  const [rows, countRows] = await Promise.all([
    db.select().from(journalEntries).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
    db.select({ c: count() }).from(journalEntries).where(where),
  ]);

  return {
    journals: rows.map(mapJournal),
    totalCount: countRows[0]?.c ?? 0,
  };
}

/**
 * Get single journal entry by ID (validates user ownership)
 */
export async function getJournalById(id: string, userId: string): Promise<JournalEntry | null> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .limit(1);

  return rows[0] ? mapJournal(rows[0]) : null;
}

/**
 * Get single journal entry with linked goals
 */
export async function getJournalWithGoals(
  id: string,
  userId: string
): Promise<JournalEntryWithGoals | null> {
  const journal = await getJournalById(id, userId);
  if (!journal) return null;

  const mentionedGoals = await getJournalGoals(id, userId);

  return {
    ...journal,
    mentionedGoals,
  };
}

/**
 * Create new journal entry
 */
export async function createJournalEntry(
  userId: string,
  input: CreateJournalEntryInput
): Promise<JournalEntry> {
  const rows = await db
    .insert(journalEntries)
    .values({
      userId,
      title: input.title ?? null,
      content: input.content,
      entryDate: input.entryDate ?? new Date().toLocaleDateString('en-CA'),
      mood: input.mood ?? null,
      tags: input.tags ?? [],
    })
    .returning();

  return mapJournal(rows[0]);
}

/**
 * Create journal entry with goal links (transactional)
 */
export async function createJournalEntryWithGoals(
  userId: string,
  input: CreateJournalEntryInput
): Promise<JournalEntryWithGoals> {
  // Create journal entry
  const journal = await createJournalEntry(userId, input);

  // Link goals if provided
  let mentionedGoals: Goal[] = [];
  if (input.goalIds && input.goalIds.length > 0) {
    await linkJournalToGoals(journal.id, input.goalIds);
    mentionedGoals = await fetchGoalsByIds(input.goalIds, userId);
  }

  return {
    ...journal,
    mentionedGoals,
  };
}

/**
 * Update existing journal entry (validates user ownership)
 */
export async function updateJournalEntry(
  id: string,
  userId: string,
  input: UpdateJournalEntryInput
): Promise<JournalEntry | null> {
  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.entryDate !== undefined) updateData.entryDate = input.entryDate;
  if (input.mood !== undefined) updateData.mood = input.mood;
  if (input.tags !== undefined) updateData.tags = input.tags;

  // updated_at maintained by DB trigger; nothing to update -> return current
  if (Object.keys(updateData).length === 0) {
    return getJournalById(id, userId);
  }

  const rows = await db
    .update(journalEntries)
    .set(updateData)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();

  return rows[0] ? mapJournal(rows[0]) : null;
}

/**
 * Update journal entry with goal links
 */
export async function updateJournalEntryWithGoals(
  id: string,
  userId: string,
  input: UpdateJournalEntryInput
): Promise<JournalEntryWithGoals | null> {
  // First update the journal entry fields
  const journal = await updateJournalEntry(id, userId, input);
  if (!journal) return null;

  // If goalIds provided, replace all goal links
  let mentionedGoals: Goal[] = [];
  if (input.goalIds !== undefined) {
    // Remove all existing links
    await unlinkJournalFromGoals(id);

    // Add new links
    if (input.goalIds.length > 0) {
      await linkJournalToGoals(id, input.goalIds);
      mentionedGoals = await fetchGoalsByIds(input.goalIds, userId);
    }
  } else {
    // Fetch existing links
    mentionedGoals = await getJournalGoals(id, userId);
  }

  return {
    ...journal,
    mentionedGoals,
  };
}

/**
 * Delete journal entry (hard delete, validates user ownership)
 */
export async function deleteJournalEntry(id: string, userId: string): Promise<boolean> {
  // Delete goal mentions first (foreign key constraint)
  await db
    .delete(journalGoalMentions)
    .where(eq(journalGoalMentions.journalEntryId, id));

  const rows = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning({ id: journalEntries.id });

  return rows.length > 0;
}

/**
 * Link journal entry to goals (create mentions)
 */
export async function linkJournalToGoals(
  journalId: string,
  goalIds: string[],
  mentionedExplicitly: boolean = true
): Promise<void> {
  if (goalIds.length === 0) return;

  const insertData = goalIds.map((goalId) => ({
    journalEntryId: journalId,
    goalId,
    mentionedExplicitly,
  }));

  // Upsert ignoring duplicates on (journal_entry_id, goal_id)
  await db
    .insert(journalGoalMentions)
    .values(insertData)
    .onConflictDoNothing({
      target: [journalGoalMentions.journalEntryId, journalGoalMentions.goalId],
    });
}

/**
 * Unlink journal entry from goals (remove mentions)
 */
export async function unlinkJournalFromGoals(
  journalId: string,
  goalIds?: string[]
): Promise<void> {
  const conditions = [eq(journalGoalMentions.journalEntryId, journalId)];
  if (goalIds && goalIds.length > 0) {
    conditions.push(inArray(journalGoalMentions.goalId, goalIds));
  }

  await db.delete(journalGoalMentions).where(and(...conditions));
}

/** Fetch goals owned by user matching ids (helper) */
async function fetchGoalsByIds(goalIds: string[], userId: string): Promise<Goal[]> {
  if (goalIds.length === 0) return [];
  const rows = await db
    .select()
    .from(goals)
    .where(and(inArray(goals.id, goalIds), eq(goals.userId, userId)));
  return rows.map(mapGoal);
}

/**
 * Get goals linked to a journal entry
 */
export async function getJournalGoals(
  journalId: string,
  userId: string
): Promise<Goal[]> {
  const mentions = await db
    .select({ goalId: journalGoalMentions.goalId })
    .from(journalGoalMentions)
    .where(eq(journalGoalMentions.journalEntryId, journalId));

  if (mentions.length === 0) {
    return [];
  }

  return fetchGoalsByIds(mentions.map((m) => m.goalId), userId);
}

/**
 * Get journal entries with linked goals (solves N+1 query problem)
 * Single relational query fetches all journals with their mentionedGoals
 */
export async function getJournalEntriesWithGoals(
  userId: string,
  options: GetJournalsOptions = {}
): Promise<JournalsWithGoalsQueryResult> {
  const { filters, sort, pagination } = options;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(journalEntries.userId, userId)];

  if (filters?.mood) {
    conditions.push(eq(journalEntries.mood, filters.mood));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(journalEntries.entryDate, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(journalEntries.entryDate, filters.dateTo));
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(journalEntries.title, `%${filters.search}%`),
        ilike(journalEntries.content, `%${filters.search}%`)
      )!
    );
  }
  if (filters?.tags && filters.tags.length > 0) {
    conditions.push(arrayOverlaps(journalEntries.tags, filters.tags));
  }

  // Filter by goal mention - requires subquery
  if (filters?.goalId) {
    const mentionRows = await db
      .select({ journalEntryId: journalGoalMentions.journalEntryId })
      .from(journalGoalMentions)
      .where(eq(journalGoalMentions.goalId, filters.goalId));

    if (mentionRows.length > 0) {
      conditions.push(
        inArray(journalEntries.id, mentionRows.map((m) => m.journalEntryId))
      );
    } else {
      return { journals: [], totalCount: 0 };
    }
  }

  const where = and(...conditions);

  const sortField = sort?.field ?? 'entry_date';
  const sortDir = sort?.direction ?? 'desc';
  const sortCol = JOURNAL_SORT_COLUMNS[sortField] ?? journalEntries.entryDate;
  const orderBy = sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

  const [rows, countRows] = await Promise.all([
    db.query.journalEntries.findMany({
      where,
      orderBy,
      limit: pageSize,
      offset,
      with: {
        mentions: {
          with: {
            goal: true,
          },
        },
      },
    }),
    db.select({ c: count() }).from(journalEntries).where(where),
  ]);

  const journals: JournalEntryWithGoals[] = rows.map((row) => {
    const { mentions, ...entry } = row;
    const journalEntry = mapJournal(entry);
    const mentionedGoals: Goal[] = (mentions ?? [])
      .filter((m) => m.goal !== null && m.goal !== undefined)
      .map((m) => mapGoal(m.goal));

    return {
      ...journalEntry,
      mentionedGoals,
    };
  });

  return {
    journals,
    totalCount: countRows[0]?.c ?? 0,
  };
}

/**
 * Get unique tags for a user (for filter dropdowns)
 */
export async function getJournalTags(userId: string): Promise<string[]> {
  const rows = await db
    .select({ tags: journalEntries.tags })
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), sql`${journalEntries.tags} IS NOT NULL`));

  const tags = new Set<string>();
  for (const row of rows) {
    if (row.tags && Array.isArray(row.tags)) {
      for (const tag of row.tags) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags).sort();
}
