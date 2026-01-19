/**
 * Database types matching Supabase schema
 * Generated from supabase/migrations/20260103000000_initial_schema.sql
 */

// ============================================
// Enums
// ============================================

export type GoalType = 'long-term' | 'short-term';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export type AnalysisType = 'on-demand' | 'weekly' | 'monthly';

export type Mood =
  | 'great'
  | 'good'
  | 'neutral'
  | 'bad'
  | 'terrible';

// ============================================
// Database Row Types (exact DB representation)
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      goals: {
        Row: GoalRow;
        Insert: GoalInsert;
        Update: GoalUpdate;
      };
      journal_entries: {
        Row: JournalEntryRow;
        Insert: JournalEntryInsert;
        Update: JournalEntryUpdate;
      };
      journal_goal_mentions: {
        Row: JournalGoalMentionRow;
        Insert: JournalGoalMentionInsert;
        Update: JournalGoalMentionUpdate;
      };
      ai_analyses: {
        Row: AIAnalysisRow;
        Insert: AIAnalysisInsert;
        Update: AIAnalysisUpdate;
      };
      weekly_insights: {
        Row: WeeklyInsightRow;
        Insert: WeeklyInsightInsert;
        Update: WeeklyInsightUpdate;
      };
    };
  };
}

// ============================================
// Profiles
// ============================================

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
}

// ============================================
// Goals
// ============================================

export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: GoalType;
  category: string | null;
  target_date: string | null;
  status: GoalStatus;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface GoalInsert {
  id?: string;
  user_id: string;
  title: string;
  description?: string | null;
  type: GoalType;
  category?: string | null;
  target_date?: string | null;
  status?: GoalStatus;
  progress_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GoalUpdate {
  id?: string;
  user_id?: string;
  title?: string;
  description?: string | null;
  type?: GoalType;
  category?: string | null;
  target_date?: string | null;
  status?: GoalStatus;
  progress_percentage?: number;
  updated_at?: string;
}

// ============================================
// Journal Entries
// ============================================

export interface JournalEntryRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  entry_date: string;
  mood: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryInsert {
  id?: string;
  user_id: string;
  title?: string | null;
  content: string;
  entry_date?: string;
  mood?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryUpdate {
  id?: string;
  user_id?: string;
  title?: string | null;
  content?: string;
  entry_date?: string;
  mood?: string | null;
  tags?: string[] | null;
  updated_at?: string;
}

// ============================================
// Journal-Goal Mentions
// ============================================

export interface JournalGoalMentionRow {
  id: string;
  journal_entry_id: string;
  goal_id: string;
  mentioned_explicitly: boolean;
  created_at: string;
}

export interface JournalGoalMentionInsert {
  id?: string;
  journal_entry_id: string;
  goal_id: string;
  mentioned_explicitly?: boolean;
  created_at?: string;
}

export interface JournalGoalMentionUpdate {
  id?: string;
  journal_entry_id?: string;
  goal_id?: string;
  mentioned_explicitly?: boolean;
}

// ============================================
// AI Analyses
// ============================================

export interface AIAnalysisInsights {
  patterns?: string[];
  sentiment?: string;
  key_themes?: string[];
  goal_alignment?: Record<string, number>;
  [key: string]: unknown;
}

export interface AIAnalysisRecommendations {
  suggestions?: string[];
  action_items?: string[];
  focus_areas?: string[];
  [key: string]: unknown;
}

export interface AIProgressSummary {
  overall_progress?: number;
  goals_on_track?: string[];
  goals_behind?: string[];
  momentum_score?: number;
  [key: string]: unknown;
}

export interface AIAnalysisRow {
  id: string;
  user_id: string;
  analysis_type: AnalysisType;
  journal_entries_analyzed: string[];
  goals_analyzed: string[];
  insights: AIAnalysisInsights;
  recommendations: AIAnalysisRecommendations | null;
  progress_summary: AIProgressSummary | null;
  tokens_used: number | null;
  created_at: string;
}

export interface AIAnalysisInsert {
  id?: string;
  user_id: string;
  analysis_type: AnalysisType;
  journal_entries_analyzed: string[];
  goals_analyzed: string[];
  insights: AIAnalysisInsights;
  recommendations?: AIAnalysisRecommendations | null;
  progress_summary?: AIProgressSummary | null;
  tokens_used?: number | null;
  created_at?: string;
}

export interface AIAnalysisUpdate {
  id?: string;
  user_id?: string;
  analysis_type?: AnalysisType;
  journal_entries_analyzed?: string[];
  goals_analyzed?: string[];
  insights?: AIAnalysisInsights;
  recommendations?: AIAnalysisRecommendations | null;
  progress_summary?: AIProgressSummary | null;
  tokens_used?: number | null;
}

// ============================================
// Weekly Insights
// ============================================

export interface KeyAchievement {
  title: string;
  description?: string;
  goal_id?: string;
  date?: string;
}

export interface AreaForImprovement {
  area: string;
  suggestion: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface GoalProgressUpdate {
  goal_id: string;
  goal_title: string;
  previous_progress: number;
  current_progress: number;
  change: number;
  notes?: string;
}

export interface WeeklyInsightRow {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  key_achievements: KeyAchievement[] | null;
  areas_for_improvement: AreaForImprovement[] | null;
  goal_progress_updates: GoalProgressUpdate[] | null;
  ai_analysis_id: string | null;
  created_at: string;
}

export interface WeeklyInsightInsert {
  id?: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  key_achievements?: KeyAchievement[] | null;
  areas_for_improvement?: AreaForImprovement[] | null;
  goal_progress_updates?: GoalProgressUpdate[] | null;
  ai_analysis_id?: string | null;
  created_at?: string;
}

export interface WeeklyInsightUpdate {
  id?: string;
  user_id?: string;
  week_start_date?: string;
  week_end_date?: string;
  summary?: string;
  key_achievements?: KeyAchievement[] | null;
  areas_for_improvement?: AreaForImprovement[] | null;
  goal_progress_updates?: GoalProgressUpdate[] | null;
  ai_analysis_id?: string | null;
}

// ============================================
// Supabase Client Type Helper
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
