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

/** Format a Date as YYYY-MM-DD using local timezone */
function toLocalDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

/** Parse YYYY-MM-DD string to Date in local timezone (noon to avoid DST edge cases) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

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
  entryDate?: string;
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
 * Get ISO week start (Monday) for a date
 * Matches component's getWeekStart logic
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday = 0: if Sunday (0), go back 6 days; else go back (day - 1) days
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get date range based on timeline
 */
function getDateRange(timeline: Timeline): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = toLocalDateStr(now);
  let startDate: string;

  switch (timeline) {
    case 'week':
      // Use ISO week start (Monday) to align with component's date display
      const weekStart = getWeekStart(now);
      startDate = toLocalDateStr(weekStart);
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = toLocalDateStr(monthAgo);
      break;
    case 'year':
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      startDate = toLocalDateStr(yearAgo);
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
  const today = toLocalDateStr(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toLocalDateStr(yesterdayDate);
  const hasRecentEntry = uniqueDates[0] === today || uniqueDates[0] === yesterday;

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = parseLocalDate(uniqueDates[i]);
    const next = parseLocalDate(uniqueDates[i + 1]);
    const diffDays = Math.round((current.getTime() - next.getTime()) / 86400000);

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
      const current = parseLocalDate(uniqueDates[i]);
      const next = parseLocalDate(uniqueDates[i + 1]);
      const diffDays = Math.round((current.getTime() - next.getTime()) / 86400000);
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
    entryDate: j.entry_date,
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
  const current = parseLocalDate(startDate);
  const endLocal = parseLocalDate(endDate);
  while (current <= endLocal) {
    const dateStr = toLocalDateStr(current);
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

    const nextDateStr = toLocalDateStr(nextDate);

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

// ============================================
// Heat Map Types and Functions
// ============================================

export interface HeatMapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
  hasGoalMention: boolean;
}

export interface HeatMapResult {
  data: HeatMapDataPoint[];
  totalEntries: number;
  daysWithEntries: number;
  maxCount: number;
}

/**
 * Get journal entry heat map data grouped by date
 * Optimized query using date aggregation
 */
export async function getJournalHeatMapData(
  supabase: SupabaseClientAny,
  userId: string,
  timeline: Timeline
): Promise<HeatMapResult> {
  const { startDate, endDate } = getDateRange(timeline);

  // Get journal entries with date and goal mention info
  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      id,
      entry_date,
      journal_goal_mentions (goal_id)
    `)
    .eq('user_id', userId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch heat map data: ${error.message}`);
  }

  const entries = data ?? [];

  // Group by date
  const dateMap = new Map<string, { count: number; hasGoalMention: boolean }>();

  for (const entry of entries) {
    const date = entry.entry_date;
    const existing = dateMap.get(date) ?? { count: 0, hasGoalMention: false };
    existing.count++;
    if (entry.journal_goal_mentions && entry.journal_goal_mentions.length > 0) {
      existing.hasGoalMention = true;
    }
    dateMap.set(date, existing);
  }

  // Convert to array
  const heatMapData: HeatMapDataPoint[] = [];
  let maxCount = 0;

  dateMap.forEach(({ count, hasGoalMention }, date) => {
    heatMapData.push({ date, count, hasGoalMention });
    if (count > maxCount) maxCount = count;
  });

  // Sort by date
  heatMapData.sort((a, b) => a.date.localeCompare(b.date));

  return {
    data: heatMapData,
    totalEntries: entries.length,
    daysWithEntries: dateMap.size,
    maxCount,
  };
}

// ============================================
// Goal Activity Heat Map (New Design)
// ============================================

export interface GoalInfo {
  id: string;
  title: string;
  color: string;
}

export interface GoalActivityDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

export interface GoalActivityData {
  goalId: string;
  dates: Set<string>; // Dates when goal was worked on
}

export interface GoalActivityHeatMapResult {
  goals: GoalInfo[];
  activityByGoal: Record<string, string[]>; // goalId -> array of dates
  dateRange: {
    start: string;
    end: string;
  };
}

// Predefined colors for goals (cycle through if more goals)
const GOAL_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#6366F1', // indigo-500
];

/**
 * Get goal activity heat map data
 * Returns goals and which days they were worked on (via journal mentions)
 */
export async function getGoalActivityHeatMapData(
  supabase: SupabaseClientAny,
  userId: string,
  timeline: Timeline
): Promise<GoalActivityHeatMapResult> {
  const { startDate, endDate } = getDateRange(timeline);

  // Get all active goals for user
  const { data: goalsData, error: goalsError } = await supabase
    .from('goals')
    .select('id, title')
    .eq('user_id', userId)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: true });

  if (goalsError) {
    throw new Error(`Failed to fetch goals: ${goalsError.message}`);
  }

  const goals = goalsData ?? [];

  // Assign colors to goals
  const goalsWithColors: GoalInfo[] = goals.map((g, idx) => ({
    id: g.id,
    title: g.title,
    color: GOAL_COLORS[idx % GOAL_COLORS.length],
  }));

  // Get all journal entries with goal mentions in date range
  // Query from journal_entries to properly filter by user_id, then join mentions
  const { data: entriesWithMentions, error: mentionsError } = await supabase
    .from('journal_entries')
    .select(`
      entry_date,
      journal_goal_mentions (goal_id)
    `)
    .eq('user_id', userId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate);

  if (mentionsError) {
    throw new Error(`Failed to fetch goal mentions: ${mentionsError.message}`);
  }

  // Build activity map
  const activityByGoal: Record<string, string[]> = {};

  // Initialize all goals with empty arrays
  for (const goal of goalsWithColors) {
    activityByGoal[goal.id] = [];
  }

  // Populate with actual activity data from entries
  const goalDateSets: Record<string, Set<string>> = {};
  const entries = entriesWithMentions ?? [];

  for (const entry of entries) {
    const mentions = entry.journal_goal_mentions ?? [];
    for (const mention of mentions) {
      const goalId = (mention as { goal_id: string }).goal_id;
      if (!goalDateSets[goalId]) {
        goalDateSets[goalId] = new Set();
      }
      goalDateSets[goalId].add(entry.entry_date);
    }
  }

  // Convert Sets to arrays
  for (const goalId of Object.keys(goalDateSets)) {
    activityByGoal[goalId] = Array.from(goalDateSets[goalId]).sort();
  }

  return {
    goals: goalsWithColors,
    activityByGoal,
    dateRange: {
      start: startDate,
      end: endDate,
    },
  };
}
