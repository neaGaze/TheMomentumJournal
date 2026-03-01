/**
 * Journal database query functions
 * All functions return domain models (camelCase)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { JournalEntryRow, GoalRow } from '@/types/database.types';
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
import {
  mapJournalEntryFromRow as mapJournal,
  mapGoalFromRow as mapGoal,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

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

/**
 * Get journal entries for a user with optional filtering, sorting, pagination
 */
export async function getJournalEntries(
  supabase: SupabaseClientAny,
  userId: string,
  options: GetJournalsOptions = {}
): Promise<JournalsQueryResult> {
  const { filters, sort, pagination } = options;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('journal_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Apply filters
  if (filters?.mood) {
    query = query.eq('mood', filters.mood);
  }
  if (filters?.dateFrom) {
    query = query.gte('entry_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('entry_date', filters.dateTo);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
    );
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  // Filter by goal mention - requires subquery
  if (filters?.goalId) {
    const { data: mentionData } = await supabase
      .from('journal_goal_mentions')
      .select('journal_entry_id')
      .eq('goal_id', filters.goalId);

    if (mentionData && mentionData.length > 0) {
      const journalIds = mentionData.map((m: { journal_entry_id: string }) => m.journal_entry_id);
      query = query.in('id', journalIds);
    } else {
      // No journals mention this goal
      return { journals: [], totalCount: 0 };
    }
  }

  // Apply sorting
  const sortField = sort?.field ?? 'entry_date';
  const sortDir = sort?.direction ?? 'desc';
  query = query.order(sortField, { ascending: sortDir === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch journals: ${error.message}`);
  }

  return {
    journals: (data ?? []).map(mapJournal),
    totalCount: count ?? 0,
  };
}

/**
 * Get single journal entry by ID (validates user ownership)
 */
export async function getJournalById(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch journal: ${error.message}`);
  }

  return data ? mapJournal(data) : null;
}

/**
 * Get single journal entry with linked goals
 */
export async function getJournalWithGoals(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<JournalEntryWithGoals | null> {
  const journal = await getJournalById(supabase, id, userId);
  if (!journal) return null;

  // Fetch linked goals
  const { data: mentions, error: mentionsError } = await supabase
    .from('journal_goal_mentions')
    .select('goal_id')
    .eq('journal_entry_id', id);

  if (mentionsError) {
    throw new Error(`Failed to fetch goal mentions: ${mentionsError.message}`);
  }

  let mentionedGoals: Goal[] = [];
  if (mentions && mentions.length > 0) {
    const goalIds = mentions.map((m: { goal_id: string }) => m.goal_id);
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .in('id', goalIds)
      .eq('user_id', userId);

    if (goalsError) {
      throw new Error(`Failed to fetch linked goals: ${goalsError.message}`);
    }

    mentionedGoals = (goals ?? []).map(mapGoal);
  }

  return {
    ...journal,
    mentionedGoals,
  };
}

/**
 * Create new journal entry
 */
export async function createJournalEntry(
  supabase: SupabaseClientAny,
  userId: string,
  input: CreateJournalEntryInput
): Promise<JournalEntry> {
  const insertData = {
    user_id: userId,
    title: input.title ?? null,
    content: input.content,
    entry_date: input.entryDate ?? new Date().toLocaleDateString('en-CA'),
    mood: input.mood ?? null,
    tags: input.tags ?? [],
  };

  const { data, error } = await supabase
    .from('journal_entries')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create journal: ${error.message}`);
  }

  return mapJournal(data);
}

/**
 * Create journal entry with goal links (transactional)
 */
export async function createJournalEntryWithGoals(
  supabase: SupabaseClientAny,
  userId: string,
  input: CreateJournalEntryInput
): Promise<JournalEntryWithGoals> {
  // Create journal entry
  const journal = await createJournalEntry(supabase, userId, input);

  // Link goals if provided
  let mentionedGoals: Goal[] = [];
  if (input.goalIds && input.goalIds.length > 0) {
    await linkJournalToGoals(supabase, journal.id, input.goalIds);

    // Fetch linked goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .in('id', input.goalIds)
      .eq('user_id', userId);

    if (goalsError) {
      throw new Error(`Failed to fetch linked goals: ${goalsError.message}`);
    }

    mentionedGoals = (goals ?? []).map(mapGoal);
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
  supabase: SupabaseClientAny,
  id: string,
  userId: string,
  input: UpdateJournalEntryInput
): Promise<JournalEntry | null> {
  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.entryDate !== undefined) updateData.entry_date = input.entryDate;
  if (input.mood !== undefined) updateData.mood = input.mood;
  if (input.tags !== undefined) updateData.tags = input.tags;

  // Always update timestamp
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('journal_entries')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found or no permission
    }
    throw new Error(`Failed to update journal: ${error.message}`);
  }

  return data ? mapJournal(data) : null;
}

/**
 * Update journal entry with goal links
 */
export async function updateJournalEntryWithGoals(
  supabase: SupabaseClientAny,
  id: string,
  userId: string,
  input: UpdateJournalEntryInput
): Promise<JournalEntryWithGoals | null> {
  // First update the journal entry fields
  const journal = await updateJournalEntry(supabase, id, userId, input);
  if (!journal) return null;

  // If goalIds provided, replace all goal links
  let mentionedGoals: Goal[] = [];
  if (input.goalIds !== undefined) {
    // Remove all existing links
    await unlinkJournalFromGoals(supabase, id);

    // Add new links
    if (input.goalIds.length > 0) {
      await linkJournalToGoals(supabase, id, input.goalIds);

      // Fetch linked goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .in('id', input.goalIds)
        .eq('user_id', userId);

      if (goalsError) {
        throw new Error(`Failed to fetch linked goals: ${goalsError.message}`);
      }

      mentionedGoals = (goals ?? []).map(mapGoal);
    }
  } else {
    // Fetch existing links
    const { data: mentions } = await supabase
      .from('journal_goal_mentions')
      .select('goal_id')
      .eq('journal_entry_id', id);

    if (mentions && mentions.length > 0) {
      const goalIds = mentions.map((m: { goal_id: string }) => m.goal_id);
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .in('id', goalIds)
        .eq('user_id', userId);

      mentionedGoals = (goals ?? []).map(mapGoal);
    }
  }

  return {
    ...journal,
    mentionedGoals,
  };
}

/**
 * Delete journal entry (hard delete, validates user ownership)
 */
export async function deleteJournalEntry(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<boolean> {
  // Delete goal mentions first (foreign key constraint)
  await supabase
    .from('journal_goal_mentions')
    .delete()
    .eq('journal_entry_id', id);

  const { error, count } = await supabase
    .from('journal_entries')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete journal: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Link journal entry to goals (create mentions)
 */
export async function linkJournalToGoals(
  supabase: SupabaseClientAny,
  journalId: string,
  goalIds: string[],
  mentionedExplicitly: boolean = true
): Promise<void> {
  if (goalIds.length === 0) return;

  const insertData = goalIds.map((goalId) => ({
    journal_entry_id: journalId,
    goal_id: goalId,
    mentioned_explicitly: mentionedExplicitly,
  }));

  const { error } = await supabase
    .from('journal_goal_mentions')
    .upsert(insertData, {
      onConflict: 'journal_entry_id,goal_id',
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(`Failed to link goals: ${error.message}`);
  }
}

/**
 * Unlink journal entry from goals (remove mentions)
 */
export async function unlinkJournalFromGoals(
  supabase: SupabaseClientAny,
  journalId: string,
  goalIds?: string[]
): Promise<void> {
  let query = supabase
    .from('journal_goal_mentions')
    .delete()
    .eq('journal_entry_id', journalId);

  if (goalIds && goalIds.length > 0) {
    query = query.in('goal_id', goalIds);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to unlink goals: ${error.message}`);
  }
}

/**
 * Get goals linked to a journal entry
 */
export async function getJournalGoals(
  supabase: SupabaseClientAny,
  journalId: string,
  userId: string
): Promise<Goal[]> {
  const { data: mentions, error: mentionsError } = await supabase
    .from('journal_goal_mentions')
    .select('goal_id')
    .eq('journal_entry_id', journalId);

  if (mentionsError) {
    throw new Error(`Failed to fetch goal mentions: ${mentionsError.message}`);
  }

  if (!mentions || mentions.length === 0) {
    return [];
  }

  const goalIds = mentions.map((m: { goal_id: string }) => m.goal_id);
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('*')
    .in('id', goalIds)
    .eq('user_id', userId);

  if (goalsError) {
    throw new Error(`Failed to fetch linked goals: ${goalsError.message}`);
  }

  return (goals ?? []).map(mapGoal);
}

/**
 * Get journal entries with linked goals (solves N+1 query problem)
 * Single query fetches all journals with their mentionedGoals
 */
export async function getJournalEntriesWithGoals(
  supabase: SupabaseClientAny,
  userId: string,
  options: GetJournalsOptions = {}
): Promise<JournalsWithGoalsQueryResult> {
  const { filters, sort, pagination } = options;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  // Build base query with relationship loading
  let query = supabase
    .from('journal_entries')
    .select(
      `
      *,
      journal_goal_mentions (
        goal_id,
        goals (*)
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId);

  // Apply filters
  if (filters?.mood) {
    query = query.eq('mood', filters.mood);
  }
  if (filters?.dateFrom) {
    query = query.gte('entry_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('entry_date', filters.dateTo);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
    );
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  // Filter by goal mention - requires subquery
  if (filters?.goalId) {
    const { data: mentionData } = await supabase
      .from('journal_goal_mentions')
      .select('journal_entry_id')
      .eq('goal_id', filters.goalId);

    if (mentionData && mentionData.length > 0) {
      const journalIds = mentionData.map(
        (m: { journal_entry_id: string }) => m.journal_entry_id
      );
      query = query.in('id', journalIds);
    } else {
      return { journals: [], totalCount: 0 };
    }
  }

  // Apply sorting
  const sortField = sort?.field ?? 'entry_date';
  const sortDir = sort?.direction ?? 'desc';
  query = query.order(sortField, { ascending: sortDir === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch journals: ${error.message}`);
  }

  // Transform nested data into JournalEntryWithGoals[]
  const journals: JournalEntryWithGoals[] = (data ?? []).map(
    (row: JournalEntryRow & { journal_goal_mentions?: Array<{ goal_id: string; goals: GoalRow | null }> }) => {
      const journalEntry = mapJournal(row);
      const mentionedGoals: Goal[] = (row.journal_goal_mentions ?? [])
        .filter((m) => m.goals !== null)
        .map((m) => mapGoal(m.goals as GoalRow));

      return {
        ...journalEntry,
        mentionedGoals,
      };
    }
  );

  return {
    journals,
    totalCount: count ?? 0,
  };
}

/**
 * Get unique tags for a user (for filter dropdowns)
 */
export async function getJournalTags(
  supabase: SupabaseClientAny,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('tags')
    .eq('user_id', userId)
    .not('tags', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  const tags = new Set<string>();
  for (const row of data ?? []) {
    if (row.tags && Array.isArray(row.tags)) {
      for (const tag of row.tags) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags).sort();
}
