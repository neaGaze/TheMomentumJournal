/**
 * AI Analysis database functions
 * Context fetching and analysis storage
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIAnalysisRow } from '@/types/database.types';
import type {
  Goal,
  JournalEntry,
  AIAnalysis,
  AIAnalysisInsights,
  AIAnalysisRecommendations,
  AIProgressSummary,
  AnalysisType,
  PaginationParams,
} from '@/types';
import {
  mapGoalFromRow as mapGoal,
  mapJournalEntryFromRow as mapJournal,
  mapAIAnalysisFromRow as mapAnalysis,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

// Context types for AI analysis
export interface GoalAnalysisContext {
  goal: Goal;
  relatedJournals: JournalEntry[];
}

export interface WeeklyInsightsContext {
  journals: JournalEntry[];
  goals: Goal[];
  stats: {
    activeGoals: number;
    completedGoals: number;
    journalCount: number;
    currentStreak: number;
    avgMood?: string;
  };
}

export interface JournalAnalysisContext {
  journal: JournalEntry;
  linkedGoals: Goal[];
}

// Analysis filter types
export interface AnalysisFilters {
  type?: AnalysisType;
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalysisQueryResult {
  analyses: AIAnalysis[];
  totalCount: number;
}

/**
 * Get context for goal analysis - fetches goal + related journals
 */
export async function getContextForGoalAnalysis(
  supabase: SupabaseClientAny,
  goalId: string,
  userId: string
): Promise<GoalAnalysisContext | null> {
  // Fetch goal
  const { data: goalData, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (goalError || !goalData) {
    return null;
  }

  const goal = mapGoal(goalData);

  // Fetch related journals via journal_goal_mentions
  const { data: mentions } = await supabase
    .from('journal_goal_mentions')
    .select('journal_entry_id')
    .eq('goal_id', goalId);

  let relatedJournals: JournalEntry[] = [];
  if (mentions && mentions.length > 0) {
    const journalIds = mentions.map((m: { journal_entry_id: string }) => m.journal_entry_id);

    const { data: journals } = await supabase
      .from('journal_entries')
      .select('*')
      .in('id', journalIds)
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(20); // Limit to most recent 20 for context

    if (journals) {
      relatedJournals = journals.map(mapJournal);
    }
  }

  return { goal, relatedJournals };
}

/**
 * Get context for journal analysis - fetches journal + linked goals
 */
export async function getContextForJournalAnalysis(
  supabase: SupabaseClientAny,
  journalId: string,
  userId: string
): Promise<JournalAnalysisContext | null> {
  // Fetch journal
  const { data: journalData, error: journalError } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', journalId)
    .eq('user_id', userId)
    .single();

  if (journalError || !journalData) {
    return null;
  }

  const journal = mapJournal(journalData);

  // Fetch linked goals via journal_goal_mentions
  const { data: mentions } = await supabase
    .from('journal_goal_mentions')
    .select('goal_id')
    .eq('journal_entry_id', journalId);

  let linkedGoals: Goal[] = [];
  if (mentions && mentions.length > 0) {
    const goalIds = mentions.map((m: { goal_id: string }) => m.goal_id);

    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .in('id', goalIds)
      .eq('user_id', userId);

    if (goals) {
      linkedGoals = goals.map(mapGoal);
    }
  }

  return { journal, linkedGoals };
}

/**
 * Get context for weekly/monthly insights
 */
export async function getContextForWeeklyInsights(
  supabase: SupabaseClientAny,
  userId: string,
  timeline: 'week' | 'month' = 'week'
): Promise<WeeklyInsightsContext> {
  const now = new Date();
  const startDate = new Date(now);

  if (timeline === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setMonth(now.getMonth() - 1);
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  // Fetch journals in range
  const { data: journalsData } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('entry_date', startDateStr)
    .order('entry_date', { ascending: false });

  const journals = (journalsData ?? []).map(mapJournal);

  // Fetch all goals
  const { data: goalsData } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId);

  const goals = (goalsData ?? []).map(mapGoal);

  // Calculate stats
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const journalCount = journals.length;

  // Calculate streak (simplified - consecutive days with entries)
  const currentStreak = calculateStreak(journals);

  // Calculate average mood
  const moodScores: Record<string, number> = {
    great: 5,
    good: 4,
    neutral: 3,
    bad: 2,
    terrible: 1,
  };

  const moodsWithScores = journals
    .filter(j => j.mood && moodScores[j.mood])
    .map(j => moodScores[j.mood!]);

  let avgMood: string | undefined;
  if (moodsWithScores.length > 0) {
    const avg = moodsWithScores.reduce((a, b) => a + b, 0) / moodsWithScores.length;
    if (avg >= 4.5) avgMood = 'great';
    else if (avg >= 3.5) avgMood = 'good';
    else if (avg >= 2.5) avgMood = 'neutral';
    else if (avg >= 1.5) avgMood = 'bad';
    else avgMood = 'terrible';
  }

  return {
    journals,
    goals,
    stats: {
      activeGoals,
      completedGoals,
      journalCount,
      currentStreak,
      avgMood,
    },
  };
}

/**
 * Calculate current streak of consecutive journal days
 */
function calculateStreak(journals: JournalEntry[]): number {
  if (journals.length === 0) return 0;

  // Sort by date descending
  const sorted = [...journals].sort(
    (a, b) => b.entryDate.getTime() - a.entryDate.getTime()
  );

  // Get unique dates
  const uniqueDates = new Set<string>();
  for (const j of sorted) {
    uniqueDates.add(j.entryDate.toISOString().split('T')[0]);
  }

  const dates = Array.from(uniqueDates).sort().reverse();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must start from today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.round(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Save AI analysis result
 */
export async function saveAnalysis(
  supabase: SupabaseClientAny,
  userId: string,
  type: AnalysisType,
  data: {
    journalEntriesAnalyzed: string[];
    goalsAnalyzed: string[];
    insights: AIAnalysisInsights;
    recommendations?: AIAnalysisRecommendations | null;
    progressSummary?: AIProgressSummary | null;
    tokensUsed?: number | null;
  }
): Promise<AIAnalysis> {
  const insertData = {
    user_id: userId,
    analysis_type: type,
    journal_entries_analyzed: data.journalEntriesAnalyzed,
    goals_analyzed: data.goalsAnalyzed,
    insights: data.insights,
    recommendations: data.recommendations ?? null,
    progress_summary: data.progressSummary ?? null,
    tokens_used: data.tokensUsed ?? null,
  };

  const { data: result, error } = await supabase
    .from('ai_analyses')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save analysis: ${error.message}`);
  }

  return mapAnalysis(result);
}

/**
 * Get stored analyses with pagination and filters
 */
export async function getAnalyses(
  supabase: SupabaseClientAny,
  userId: string,
  filters?: AnalysisFilters,
  pagination?: PaginationParams
): Promise<AnalysisQueryResult> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('ai_analyses')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Apply filters
  if (filters?.type) {
    query = query.eq('analysis_type', filters.type);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // Sort by newest first
  query = query.order('created_at', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch analyses: ${error.message}`);
  }

  return {
    analyses: (data ?? []).map(mapAnalysis),
    totalCount: count ?? 0,
  };
}

/**
 * Get single analysis by ID (validates user ownership)
 */
export async function getAnalysisById(
  supabase: SupabaseClientAny,
  id: string,
  userId: string
): Promise<AIAnalysis | null> {
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch analysis: ${error.message}`);
  }

  return data ? mapAnalysis(data) : null;
}

/**
 * Get cached weekly insight (to avoid regenerating)
 */
export async function getCachedWeeklyInsight(
  supabase: SupabaseClientAny,
  userId: string,
  weekStartDate: string
): Promise<AIAnalysis | null> {
  const { data } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('analysis_type', 'weekly')
    .gte('created_at', weekStartDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data ? mapAnalysis(data) : null;
}

/**
 * Get cached monthly insight
 */
export async function getCachedMonthlyInsight(
  supabase: SupabaseClientAny,
  userId: string,
  monthStartDate: string
): Promise<AIAnalysis | null> {
  const { data } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('analysis_type', 'monthly')
    .gte('created_at', monthStartDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data ? mapAnalysis(data) : null;
}
