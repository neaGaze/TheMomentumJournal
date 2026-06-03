/**
 * Shared domain enums and JSONB shapes.
 * (Row/Insert/Update DB types removed during the Drizzle migration; the
 * Drizzle schema in src/db/schema.ts is now the source of truth for table shapes.)
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
// JSONB Shapes
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
