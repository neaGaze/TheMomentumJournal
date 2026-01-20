/**
 * Dashboard database query functions
 * Aggregation queries for dashboard statistics
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GoalRow, JournalEntryRow } from '@/types/database.types';
import type { GoalStatus, GoalType, Mood, Goal, JournalEntry } from '@/types';
import { mapGoalFromRow as mapGoal, mapJournalEntryFromRow as mapJournal } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

export type Timeline = 'week' | 'month' | 'year';

// ============================================
// Response Types
// ============================================

export interface GoalsStats {
  total: number;
  byStatus: {
    active: number;
    completed: number;
    paused: number;
    abandoned: number;
  };
  byType: {
    'long-term': number;
    'short-term': number;
  };
  completionRate: number;
  averageProgress: number;
}

export interface JournalStats {
  total: number;
  byMood: {
    great: number;
    good: number;
    neutral: number;
    bad: number;
    terrible: number;
  };
  currentStreak: number;
  longestStreak: number;
  avgEntriesPerWeek: number;
}

export interface RecentActivityItem {
  type: 'goal' | 'journal';
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  // Goal-specific
  status?: GoalStatus;
  progressPercentage?: number;
  // Journal-specific
  mood?: Mood | null;
  entryDate?: Date;
}

export interface ProgressDataPoint {
  date: string;
  completedGoals: number;
  activeGoals: number;
  journalEntries: number;
  avgProgress: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get date range based on timeline
 */
function getDateRange(timeline: Timeline): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string;

  switch (timeline) {
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
      break;
    case 'year':
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      startDate = yearAgo.toISOString().split('T')[0];
      break;
  }

  return { startDate, endDate };
}

/**
 * Calculate journal writing streak
 */
function calculateStreaks(entries: { entry_date: string }[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort by date descending
  const sortedDates = entries
    .map((e) => e.entry_date)
    .sort((a, b) => b.localeCompare(a));

  // Remove duplicates (multiple entries same day)
  const uniqueDates = Array.from(new Set(sortedDates));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Check if today or yesterday has entry (for current streak)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const hasRecentEntry = uniqueDates[0] === today || uniqueDates[0] === yesterday;

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i + 1]);
    const diffDays = (current.getTime() - next.getTime()) / 86400000;

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Current streak only counts if recent
  if (hasRecentEntry) {
    currentStreak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = new Date(uniqueDates[i]);
      const next = new Date(uniqueDates[i + 1]);
      const diffDays = (current.getTime() - next.getTime()) / 86400000;
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

// ============================================
// Query Functions
// ============================================

/**
 * Get goals statistics for dashboard
 */
export async function getGoalsStats(
  supabase: SupabaseClientAny,
  userId: string,
  timeline: Timeline
): Promise<GoalsStats> {
  const { startDate } = getDateRange(timeline);

  const { data, error } = await supabase
    .from('goals')
    .select('status, type, progress_percentage, created_at, updated_at')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    throw new Error(`Failed to fetch goals stats: ${error.message}`);
  }

  const goals = data ?? [];
  const total = goals.length;

  // Count by status
  const byStatus = {
    active: 0,
    completed: 0,
    paused: 0,
    abandoned: 0,
  };
  for (const goal of goals) {
    const status = goal.status as GoalStatus;
    if (status in byStatus) {
      byStatus[status]++;
    }
  }

  // Count by type
  const byType = {
    'long-term': 0,
    'short-term': 0,
  };
  for (const goal of goals) {
    const type = goal.type as GoalType;
    if (type in byType) {
      byType[type]++;
    }
  }

  // Calculate completion rate
  const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;

  // Calculate average progress
  const totalProgress = goals.reduce((sum, g) => sum + (g.progress_percentage ?? 0), 0);
  const averageProgress = total > 0 ? Math.round(totalProgress / total) : 0;

  return {
    total,
    byStatus,
    byType,
    completionRate,
    averageProgress,
  };
}

/**
 * Get journal statistics for dashboard
 */
export async function getJournalStats(
  supabase: SupabaseClientAny,
  userId: string,
  timeline: Timeline
): Promise<JournalStats> {
  const { startDate } = getDateRange(timeline);

  // Get entries within timeline for mood stats
  const { data: timelineData, error: timelineError } = await supabase
    .from('journal_entries')
    .select('mood, entry_date')
    .eq('user_id', userId)
    .gte('entry_date', startDate);

  if (timelineError) {
    throw new Error(`Failed to fetch journal stats: ${timelineError.message}`);
  }

  // Get ALL entries for streak calculation
  const { data: allData, error: allError } = await supabase
    .from('journal_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  if (allError) {
    throw new Error(`Failed to fetch journal streak data: ${allError.message}`);
  }

  const entries = timelineData ?? [];
  const allEntries = allData ?? [];
  const total = entries.length;

  // Count by mood
  const byMood = {
    great: 0,
    good: 0,
    neutral: 0,
    bad: 0,
    terrible: 0,
  };
  for (const entry of entries) {
    const mood = entry.mood as Mood | null;
    if (mood && mood in byMood) {
      byMood[mood]++;
    }
  }

  // Calculate streaks from all entries
  const { currentStreak, longestStreak } = calculateStreaks(allEntries);

  // Calculate avg entries per week
  const weeksInTimeline = timeline === 'week' ? 1 : timeline === 'month' ? 4 : 52;
  const avgEntriesPerWeek = Math.round((total / weeksInTimeline) * 10) / 10;

  return {
    total,
    byMood,
    currentStreak,
    longestStreak,
    avgEntriesPerWeek,
  };
}

/**
 * Get recent activity combining goals and journals
 */
export async function getRecentActivity(
  supabase: SupabaseClientAny,
  userId: string,
  limit: number = 10
): Promise<RecentActivityItem[]> {
  // Fetch recent goals
  const { data: goalsData, error: goalsError } = await supabase
    .from('goals')
    .select('id, title, status, progress_percentage, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (goalsError) {
    throw new Error(`Failed to fetch recent goals: ${goalsError.message}`);
  }

  // Fetch recent journals
  const { data: journalsData, error: journalsError } = await supabase
    .from('journal_entries')
    .select('id, title, mood, entry_date, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (journalsError) {
    throw new Error(`Failed to fetch recent journals: ${journalsError.message}`);
  }

  // Map and combine
  const goals: RecentActivityItem[] = (goalsData ?? []).map((g) => ({
    type: 'goal' as const,
    id: g.id,
    title: g.title,
    createdAt: new Date(g.created_at),
    updatedAt: new Date(g.updated_at),
    status: g.status as GoalStatus,
    progressPercentage: g.progress_percentage,
  }));

  const journals: RecentActivityItem[] = (journalsData ?? []).map((j) => ({
    type: 'journal' as const,
    id: j.id,
    title: j.title ?? 'Untitled Entry',
    createdAt: new Date(j.created_at),
    updatedAt: new Date(j.updated_at),
    mood: j.mood as Mood | null,
    entryDate: new Date(j.entry_date),
  }));

  // Combine and sort by updatedAt
  const combined = [...goals, ...journals];
  combined.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return combined.slice(0, limit);
}

/**
 * Get goals progress over time for charts
 */
export async function getGoalsProgressOverTime(
  supabase: SupabaseClientAny,
  userId: string,
  timeline: Timeline
): Promise<ProgressDataPoint[]> {
  const { startDate, endDate } = getDateRange(timeline);

  // Get all goals within timeline
  const { data: goalsData, error: goalsError } = await supabase
    .from('goals')
    .select('id, status, progress_percentage, created_at, updated_at')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (goalsError) {
    throw new Error(`Failed to fetch goals progress: ${goalsError.message}`);
  }

  // Get journal entries within timeline
  const { data: journalsData, error: journalsError } = await supabase
    .from('journal_entries')
    .select('id, entry_date')
    .eq('user_id', userId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate);

  if (journalsError) {
    throw new Error(`Failed to fetch journal progress: ${journalsError.message}`);
  }

  const goals = goalsData ?? [];
  const journals = journalsData ?? [];

  // Generate date points based on timeline
  const points: ProgressDataPoint[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Determine interval
  let interval: 'day' | 'week' | 'month';
  switch (timeline) {
    case 'week':
      interval = 'day';
      break;
    case 'month':
      interval = 'week';
      break;
    case 'year':
      interval = 'month';
      break;
    default:
      interval = 'day';
      break;
  }

  // Generate date points
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const nextDate = new Date(current);

    switch (interval) {
      case 'day':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'week':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Count goals by status up to this date
    const goalsUpToDate = goals.filter(
      (g) => g.created_at.split('T')[0] <= dateStr
    );
    const completedGoals = goalsUpToDate.filter((g) => g.status === 'completed').length;
    const activeGoals = goalsUpToDate.filter((g) => g.status === 'active').length;

    // Calculate average progress
    const totalProgress = goalsUpToDate.reduce(
      (sum, g) => sum + (g.progress_percentage ?? 0),
      0
    );
    const avgProgress =
      goalsUpToDate.length > 0 ? Math.round(totalProgress / goalsUpToDate.length) : 0;

    // Count journal entries in this interval
    const journalEntries = journals.filter((j) => {
      const entryDate = j.entry_date;
      return entryDate >= dateStr && entryDate < nextDateStr;
    }).length;

    points.push({
      date: dateStr,
      completedGoals,
      activeGoals,
      journalEntries,
      avgProgress,
    });

    // Move to next interval
    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return points;
}

/**
 * Combined dashboard stats - single call for all stats
 */
export interface DashboardStats {
  goals: GoalsStats;
  journals: JournalStats;
  recentActivity: RecentActivityItem[];
}

export async function getDashboardStats(
  supabase: SupabaseClientAny,
  userId: string,
  timeline: Timeline,
  activityLimit: number = 10
): Promise<DashboardStats> {
  const [goals, journals, recentActivity] = await Promise.all([
    getGoalsStats(supabase, userId, timeline),
    getJournalStats(supabase, userId, timeline),
    getRecentActivity(supabase, userId, activityLimit),
  ]);

  return { goals, journals, recentActivity };
}
