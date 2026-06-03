/**
 * AI Analysis database functions
 * Context fetching and analysis storage
 */

import { and, eq, gte, lte, asc, desc, inArray, count } from 'drizzle-orm';
import { db } from '@/db';
import { goals, journalEntries, journalGoalMentions, aiAnalyses } from '@/db/schema';
import { mapGoal, mapJournalEntry as mapJournal, mapAIAnalysis as mapAnalysis } from '@/db/mappers';
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
  goalId: string,
  userId: string
): Promise<GoalAnalysisContext | null> {
  // Fetch goal
  const goalRows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);

  if (!goalRows[0]) {
    return null;
  }

  const goal = mapGoal(goalRows[0]);

  // Fetch related journals via journal_goal_mentions
  const mentions = await db
    .select({ journalEntryId: journalGoalMentions.journalEntryId })
    .from(journalGoalMentions)
    .where(eq(journalGoalMentions.goalId, goalId));

  let relatedJournals: JournalEntry[] = [];
  if (mentions.length > 0) {
    const journalIds = mentions.map((m) => m.journalEntryId);

    const journals = await db
      .select()
      .from(journalEntries)
      .where(and(inArray(journalEntries.id, journalIds), eq(journalEntries.userId, userId)))
      .orderBy(desc(journalEntries.entryDate))
      .limit(20); // Limit to most recent 20 for context

    relatedJournals = journals.map(mapJournal);
  }

  return { goal, relatedJournals };
}

/**
 * Get context for journal analysis - fetches journal + linked goals
 */
export async function getContextForJournalAnalysis(
  journalId: string,
  userId: string
): Promise<JournalAnalysisContext | null> {
  // Fetch journal
  const journalRows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, journalId), eq(journalEntries.userId, userId)))
    .limit(1);

  if (!journalRows[0]) {
    return null;
  }

  const journal = mapJournal(journalRows[0]);

  // Fetch linked goals via journal_goal_mentions
  const mentions = await db
    .select({ goalId: journalGoalMentions.goalId })
    .from(journalGoalMentions)
    .where(eq(journalGoalMentions.journalEntryId, journalId));

  let linkedGoals: Goal[] = [];
  if (mentions.length > 0) {
    const goalIds = mentions.map((m) => m.goalId);

    const goalRows = await db
      .select()
      .from(goals)
      .where(and(inArray(goals.id, goalIds), eq(goals.userId, userId)));

    linkedGoals = goalRows.map(mapGoal);
  }

  return { journal, linkedGoals };
}

/**
 * Get context for weekly/monthly insights
 */
export async function getContextForWeeklyInsights(
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

  const startDateStr = startDate.toLocaleDateString('en-CA');

  // Fetch journals in range
  const journalsData = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), gte(journalEntries.entryDate, startDateStr)))
    .orderBy(desc(journalEntries.entryDate));

  const journals = journalsData.map(mapJournal);

  // Fetch all goals
  const goalsData = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId));

  const goalsList = goalsData.map(mapGoal);

  // Calculate stats
  const activeGoals = goalsList.filter((g) => g.status === 'active').length;
  const completedGoals = goalsList.filter((g) => g.status === 'completed').length;
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
    .filter((j) => j.mood && moodScores[j.mood])
    .map((j) => moodScores[j.mood!]);

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
    goals: goalsList,
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
  const sorted = [...journals].sort((a, b) => b.entryDate.localeCompare(a.entryDate));

  // Get unique dates
  const uniqueDates = new Set<string>();
  for (const j of sorted) {
    uniqueDates.add(j.entryDate);
  }

  const dates = Array.from(uniqueDates).sort().reverse();

  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

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
  const rows = await db
    .insert(aiAnalyses)
    .values({
      userId,
      analysisType: type,
      journalEntriesAnalyzed: data.journalEntriesAnalyzed,
      goalsAnalyzed: data.goalsAnalyzed,
      insights: data.insights,
      recommendations: data.recommendations ?? null,
      progressSummary: data.progressSummary ?? null,
      tokensUsed: data.tokensUsed ?? null,
    })
    .returning();

  return mapAnalysis(rows[0]);
}

/**
 * Get stored analyses with pagination and filters
 */
export async function getAnalyses(
  userId: string,
  filters?: AnalysisFilters,
  pagination?: PaginationParams
): Promise<AnalysisQueryResult> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(aiAnalyses.userId, userId)];

  if (filters?.type) {
    conditions.push(eq(aiAnalyses.analysisType, filters.type));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(aiAnalyses.createdAt, new Date(filters.dateFrom)));
  }
  if (filters?.dateTo) {
    conditions.push(lte(aiAnalyses.createdAt, new Date(filters.dateTo)));
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(aiAnalyses)
      .where(where)
      .orderBy(desc(aiAnalyses.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ c: count() }).from(aiAnalyses).where(where),
  ]);

  return {
    analyses: rows.map(mapAnalysis),
    totalCount: countRows[0]?.c ?? 0,
  };
}

/**
 * Get single analysis by ID (validates user ownership)
 */
export async function getAnalysisById(id: string, userId: string): Promise<AIAnalysis | null> {
  const rows = await db
    .select()
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.id, id), eq(aiAnalyses.userId, userId)))
    .limit(1);

  return rows[0] ? mapAnalysis(rows[0]) : null;
}

/**
 * Get cached weekly insight (to avoid regenerating)
 */
export async function getCachedWeeklyInsight(
  userId: string,
  weekStartDate: string
): Promise<AIAnalysis | null> {
  const rows = await db
    .select()
    .from(aiAnalyses)
    .where(
      and(
        eq(aiAnalyses.userId, userId),
        eq(aiAnalyses.analysisType, 'weekly'),
        gte(aiAnalyses.createdAt, new Date(weekStartDate))
      )
    )
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(1);

  return rows[0] ? mapAnalysis(rows[0]) : null;
}

/**
 * Get cached monthly insight
 */
export async function getCachedMonthlyInsight(
  userId: string,
  monthStartDate: string
): Promise<AIAnalysis | null> {
  const rows = await db
    .select()
    .from(aiAnalyses)
    .where(
      and(
        eq(aiAnalyses.userId, userId),
        eq(aiAnalyses.analysisType, 'monthly'),
        gte(aiAnalyses.createdAt, new Date(monthStartDate))
      )
    )
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(1);

  return rows[0] ? mapAnalysis(rows[0]) : null;
}
