/**
 * Drizzle row -> domain model mappers.
 * Drizzle returns camelCase keys; timestamptz cols come back as Date,
 * date cols come back as strings. We convert to the @/types domain contract.
 */

import type {
  goals,
  journalEntries,
  journalGoalMentions,
  aiAnalyses,
  weeklyInsights,
} from './schema';
import type {
  Goal,
  JournalEntry,
  JournalGoalMention,
  AIAnalysis,
  WeeklyInsight,
  GoalType,
  GoalStatus,
  Mood,
  AnalysisType,
  AIAnalysisInsights,
  AIAnalysisRecommendations,
  AIProgressSummary,
  KeyAchievement,
  AreaForImprovement,
  GoalProgressUpdate,
} from '@/types';

type GoalSelect = typeof goals.$inferSelect;
type JournalEntrySelect = typeof journalEntries.$inferSelect;
type JournalGoalMentionSelect = typeof journalGoalMentions.$inferSelect;
type AIAnalysisSelect = typeof aiAnalyses.$inferSelect;
type WeeklyInsightSelect = typeof weeklyInsights.$inferSelect;

export function mapGoal(row: GoalSelect): Goal {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    type: row.type as GoalType,
    category: row.category,
    targetDate: row.targetDate ? new Date(row.targetDate) : null,
    status: (row.status ?? 'active') as GoalStatus,
    progressPercentage: row.progressPercentage ?? 0,
    parentGoalId: row.parentGoalId,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

export function mapJournalEntry(row: JournalEntrySelect): JournalEntry {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    content: row.content,
    entryDate: (row.entryDate ?? '') as string, // YYYY-MM-DD, no tz conversion
    mood: row.mood as Mood | null,
    tags: row.tags ?? [],
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

export function mapJournalGoalMention(
  row: JournalGoalMentionSelect
): JournalGoalMention {
  return {
    id: row.id,
    journalEntryId: row.journalEntryId,
    goalId: row.goalId,
    mentionedExplicitly: row.mentionedExplicitly ?? false,
    createdAt: row.createdAt ?? new Date(),
  };
}

export function mapAIAnalysis(row: AIAnalysisSelect): AIAnalysis {
  return {
    id: row.id,
    userId: row.userId,
    analysisType: row.analysisType as AnalysisType,
    journalEntriesAnalyzed: row.journalEntriesAnalyzed,
    goalsAnalyzed: row.goalsAnalyzed,
    insights: row.insights as AIAnalysisInsights,
    recommendations: row.recommendations as AIAnalysisRecommendations | null,
    progressSummary: row.progressSummary as AIProgressSummary | null,
    tokensUsed: row.tokensUsed,
    createdAt: row.createdAt ?? new Date(),
  };
}

export function mapWeeklyInsight(row: WeeklyInsightSelect): WeeklyInsight {
  return {
    id: row.id,
    userId: row.userId,
    weekStartDate: new Date(row.weekStartDate),
    weekEndDate: new Date(row.weekEndDate),
    summary: row.summary,
    keyAchievements: row.keyAchievements as KeyAchievement[] | null,
    areasForImprovement: row.areasForImprovement as AreaForImprovement[] | null,
    goalProgressUpdates: row.goalProgressUpdates as GoalProgressUpdate[] | null,
    aiAnalysisId: row.aiAnalysisId,
    createdAt: row.createdAt ?? new Date(),
  };
}
