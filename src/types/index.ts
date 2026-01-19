/**
 * Application types for The Momentum Journal
 * Domain models, form types, and API response types
 */

import type {
  GoalType,
  GoalStatus,
  AnalysisType,
  Mood,
  GoalRow,
  JournalEntryRow,
  ProfileRow,
  AIAnalysisRow,
  WeeklyInsightRow,
  JournalGoalMentionRow,
  AIAnalysisInsights,
  AIAnalysisRecommendations,
  AIProgressSummary,
  KeyAchievement,
  AreaForImprovement,
  GoalProgressUpdate,
} from './database.types';

// Re-export enums
export type { GoalType, GoalStatus, AnalysisType, Mood };

// Re-export JSONB types
export type {
  AIAnalysisInsights,
  AIAnalysisRecommendations,
  AIProgressSummary,
  KeyAchievement,
  AreaForImprovement,
  GoalProgressUpdate,
};

// ============================================
// Domain Models (Application-level types)
// ============================================

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: GoalType;
  category: string | null;
  targetDate: Date | null;
  status: GoalStatus;
  progressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  entryDate: Date;
  mood: Mood | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalGoalMention {
  id: string;
  journalEntryId: string;
  goalId: string;
  mentionedExplicitly: boolean;
  createdAt: Date;
}

export interface AIAnalysis {
  id: string;
  userId: string;
  analysisType: AnalysisType;
  journalEntriesAnalyzed: string[];
  goalsAnalyzed: string[];
  insights: AIAnalysisInsights;
  recommendations: AIAnalysisRecommendations | null;
  progressSummary: AIProgressSummary | null;
  tokensUsed: number | null;
  createdAt: Date;
}

export interface WeeklyInsight {
  id: string;
  userId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  summary: string;
  keyAchievements: KeyAchievement[] | null;
  areasForImprovement: AreaForImprovement[] | null;
  goalProgressUpdates: GoalProgressUpdate[] | null;
  aiAnalysisId: string | null;
  createdAt: Date;
}

// ============================================
// Extended Types (with relations)
// ============================================

export interface JournalEntryWithGoals extends JournalEntry {
  mentionedGoals: Goal[];
}

export interface GoalWithJournals extends Goal {
  relatedJournals: JournalEntry[];
  mentionCount: number;
}

export interface WeeklyInsightWithAnalysis extends WeeklyInsight {
  aiAnalysis: AIAnalysis | null;
}

// ============================================
// Form Input Types (Create operations)
// ============================================

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  type: GoalType;
  category?: string | null;
  targetDate?: string | null; // ISO date string
  status?: GoalStatus;
  progressPercentage?: number;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  type?: GoalType;
  category?: string | null;
  targetDate?: string | null;
  status?: GoalStatus;
  progressPercentage?: number;
}

export interface CreateJournalEntryInput {
  title?: string | null;
  content: string;
  entryDate?: string; // ISO date string
  mood?: Mood | null;
  tags?: string[];
  goalIds?: string[]; // Goals to link
}

export interface UpdateJournalEntryInput {
  title?: string | null;
  content?: string;
  entryDate?: string;
  mood?: Mood | null;
  tags?: string[];
  goalIds?: string[];
}

export interface UpdateProfileInput {
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface RequestAnalysisInput {
  analysisType: AnalysisType;
  journalEntryIds?: string[];
  goalIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error: ApiError | null;
  success: boolean;
}

// Specific API responses
export type GoalResponse = ApiResponse<Goal>;
export type GoalsResponse = ApiResponse<Goal[]>;
export type GoalsPaginatedResponse = PaginatedResponse<Goal>;

export type JournalEntryResponse = ApiResponse<JournalEntry>;
export type JournalEntriesResponse = ApiResponse<JournalEntry[]>;
export type JournalEntriesPaginatedResponse = PaginatedResponse<JournalEntry>;

export type ProfileResponse = ApiResponse<Profile>;

export type AIAnalysisResponse = ApiResponse<AIAnalysis>;
export type WeeklyInsightResponse = ApiResponse<WeeklyInsight>;
export type WeeklyInsightsResponse = ApiResponse<WeeklyInsight[]>;

// ============================================
// Query/Filter Types
// ============================================

export interface GoalFilters {
  type?: GoalType;
  status?: GoalStatus;
  category?: string;
  search?: string;
}

export interface GoalSortOptions {
  field: 'title' | 'created_at' | 'updated_at' | 'target_date' | 'progress_percentage';
  direction: 'asc' | 'desc';
}

export interface JournalFilters {
  mood?: Mood;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  goalId?: string;
}

export interface JournalSortOptions {
  field: 'entry_date' | 'created_at' | 'updated_at' | 'title';
  direction: 'asc' | 'desc';
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ============================================
// Mapper Functions (DB Row <-> Domain Model)
// ============================================

export function mapProfileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapGoalFromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    type: row.type,
    category: row.category,
    targetDate: row.target_date ? new Date(row.target_date) : null,
    status: row.status,
    progressPercentage: row.progress_percentage,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapJournalEntryFromRow(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    entryDate: new Date(row.entry_date),
    mood: row.mood as Mood | null,
    tags: row.tags ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapJournalGoalMentionFromRow(row: JournalGoalMentionRow): JournalGoalMention {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    goalId: row.goal_id,
    mentionedExplicitly: row.mentioned_explicitly,
    createdAt: new Date(row.created_at),
  };
}

export function mapAIAnalysisFromRow(row: AIAnalysisRow): AIAnalysis {
  return {
    id: row.id,
    userId: row.user_id,
    analysisType: row.analysis_type,
    journalEntriesAnalyzed: row.journal_entries_analyzed,
    goalsAnalyzed: row.goals_analyzed,
    insights: row.insights,
    recommendations: row.recommendations,
    progressSummary: row.progress_summary,
    tokensUsed: row.tokens_used,
    createdAt: new Date(row.created_at),
  };
}

export function mapWeeklyInsightFromRow(row: WeeklyInsightRow): WeeklyInsight {
  return {
    id: row.id,
    userId: row.user_id,
    weekStartDate: new Date(row.week_start_date),
    weekEndDate: new Date(row.week_end_date),
    summary: row.summary,
    keyAchievements: row.key_achievements,
    areasForImprovement: row.areas_for_improvement,
    goalProgressUpdates: row.goal_progress_updates,
    aiAnalysisId: row.ai_analysis_id,
    createdAt: new Date(row.created_at),
  };
}

// ============================================
// Type Guards
// ============================================

export function isGoalType(value: unknown): value is GoalType {
  return value === 'long-term' || value === 'short-term';
}

export function isGoalStatus(value: unknown): value is GoalStatus {
  return ['active', 'completed', 'paused', 'abandoned'].includes(value as string);
}

export function isMood(value: unknown): value is Mood {
  return ['great', 'good', 'neutral', 'bad', 'terrible'].includes(value as string);
}

export function isAnalysisType(value: unknown): value is AnalysisType {
  return ['on-demand', 'weekly', 'monthly'].includes(value as string);
}

// ============================================
// Constants
// ============================================

export const GOAL_TYPES: GoalType[] = ['long-term', 'short-term'];

export const GOAL_STATUSES: GoalStatus[] = ['active', 'completed', 'paused', 'abandoned'];

export const MOODS: Mood[] = ['great', 'good', 'neutral', 'bad', 'terrible'];

export const ANALYSIS_TYPES: AnalysisType[] = ['on-demand', 'weekly', 'monthly'];

export const DEFAULT_PAGE_SIZE = 10;

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
  abandoned: 'Abandoned',
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  'long-term': 'Long Term',
  'short-term': 'Short Term',
};

export const MOOD_LABELS: Record<Mood, string> = {
  great: 'Great',
  good: 'Good',
  neutral: 'Neutral',
  bad: 'Bad',
  terrible: 'Terrible',
};

export const MOOD_EMOJIS: Record<Mood, string> = {
  great: '5/5',
  good: '4/5',
  neutral: '3/5',
  bad: '2/5',
  terrible: '1/5',
};
