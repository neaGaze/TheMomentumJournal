/**
 * Dashboard database query functions
 * Aggregation queries for dashboard statistics
 */

import { and, eq, gte, lte, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { goals, journalEntries, journalGoalMentions } from '@/db/schema';
import type { GoalStatus, GoalType, Mood } from '@/types';

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
function calculateStreaks(entries: { entryDate: string }[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort by date descending
  const sortedDates = entries
    .map((e) => e.entryDate)
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
  userId: string,
  timeline: Timeline
): Promise<GoalsStats> {
  const { startDate } = getDateRange(timeline);

  const data = await db
    .select({
      status: goals.status,
      type: goals.type,
      progressPercentage: goals.progressPercentage,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .where(and(eq(goals.userId, userId), gte(goals.createdAt, new Date(startDate))));

  const total = data.length;

  // Count by status
  const byStatus = {
    active: 0,
    completed: 0,
    paused: 0,
    abandoned: 0,
  };
  for (const goal of data) {
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
  for (const goal of data) {
    const type = goal.type as GoalType;
    if (type in byType) {
      byType[type]++;
    }
  }

  // Calculate completion rate
  const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;

  // Calculate average progress
  const totalProgress = data.reduce((sum, g) => sum + (g.progressPercentage ?? 0), 0);
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
  userId: string,
  timeline: Timeline
): Promise<JournalStats> {
  const { startDate } = getDateRange(timeline);

  // Get entries within timeline for mood stats
  const timelineData = await db
    .select({ mood: journalEntries.mood, entryDate: journalEntries.entryDate })
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), gte(journalEntries.entryDate, startDate)));

  // Get ALL entries for streak calculation
  const allData = await db
    .select({ entryDate: journalEntries.entryDate })
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.entryDate));

  const total = timelineData.length;

  // Count by mood
  const byMood = {
    great: 0,
    good: 0,
    neutral: 0,
    bad: 0,
    terrible: 0,
  };
  for (const entry of timelineData) {
    const mood = entry.mood as Mood | null;
    if (mood && mood in byMood) {
      byMood[mood]++;
    }
  }

  // Calculate streaks from all entries (filter out any null entry_date)
  const allEntries = allData.filter(
    (e): e is { entryDate: string } => e.entryDate !== null
  );
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
  userId: string,
  limit: number = 10
): Promise<RecentActivityItem[]> {
  // Fetch recent goals
  const goalsData = await db
    .select({
      id: goals.id,
      title: goals.title,
      status: goals.status,
      progressPercentage: goals.progressPercentage,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.updatedAt))
    .limit(limit);

  // Fetch recent journals
  const journalsData = await db
    .select({
      id: journalEntries.id,
      title: journalEntries.title,
      mood: journalEntries.mood,
      entryDate: journalEntries.entryDate,
      createdAt: journalEntries.createdAt,
      updatedAt: journalEntries.updatedAt,
    })
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.updatedAt))
    .limit(limit);

  // Map and combine
  const goalItems: RecentActivityItem[] = goalsData.map((g) => ({
    type: 'goal' as const,
    id: g.id,
    title: g.title,
    createdAt: g.createdAt ?? new Date(),
    updatedAt: g.updatedAt ?? new Date(),
    status: g.status as GoalStatus,
    progressPercentage: g.progressPercentage ?? 0,
  }));

  const journalItems: RecentActivityItem[] = journalsData.map((j) => ({
    type: 'journal' as const,
    id: j.id,
    title: j.title ?? 'Untitled Entry',
    createdAt: j.createdAt ?? new Date(),
    updatedAt: j.updatedAt ?? new Date(),
    mood: j.mood as Mood | null,
    entryDate: j.entryDate ?? undefined,
  }));

  // Combine and sort by updatedAt
  const combined = [...goalItems, ...journalItems];
  combined.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return combined.slice(0, limit);
}

/**
 * Get goals progress over time for charts
 */
export async function getGoalsProgressOverTime(
  userId: string,
  timeline: Timeline
): Promise<ProgressDataPoint[]> {
  const { startDate, endDate } = getDateRange(timeline);

  // Get all goals within timeline
  const goalsData = await db
    .select({
      id: goals.id,
      status: goals.status,
      progressPercentage: goals.progressPercentage,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .where(and(eq(goals.userId, userId), gte(goals.createdAt, new Date(startDate))));

  // Get journal entries within timeline
  const journalsData = await db
    .select({ id: journalEntries.id, entryDate: journalEntries.entryDate })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        gte(journalEntries.entryDate, startDate),
        lte(journalEntries.entryDate, endDate)
      )
    );

  // Precompute createdAt date-only string for each goal (timestamptz -> YYYY-MM-DD)
  const goalsList = goalsData.map((g) => ({
    status: g.status,
    progressPercentage: g.progressPercentage ?? 0,
    createdDateStr: g.createdAt ? toLocalDateStr(g.createdAt) : '',
  }));

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
    const goalsUpToDate = goalsList.filter((g) => g.createdDateStr <= dateStr);
    const completedGoals = goalsUpToDate.filter((g) => g.status === 'completed').length;
    const activeGoals = goalsUpToDate.filter((g) => g.status === 'active').length;

    // Calculate average progress
    const totalProgress = goalsUpToDate.reduce(
      (sum, g) => sum + (g.progressPercentage ?? 0),
      0
    );
    const avgProgress =
      goalsUpToDate.length > 0 ? Math.round(totalProgress / goalsUpToDate.length) : 0;

    // Count journal entries in this interval
    const journalEntryCount = journalsData.filter((j) => {
      const entryDate = j.entryDate;
      return entryDate !== null && entryDate >= dateStr && entryDate < nextDateStr;
    }).length;

    points.push({
      date: dateStr,
      completedGoals,
      activeGoals,
      journalEntries: journalEntryCount,
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
  userId: string,
  timeline: Timeline,
  activityLimit: number = 10
): Promise<DashboardStats> {
  const [goalsStats, journalsStats, recentActivity] = await Promise.all([
    getGoalsStats(userId, timeline),
    getJournalStats(userId, timeline),
    getRecentActivity(userId, activityLimit),
  ]);

  return { goals: goalsStats, journals: journalsStats, recentActivity };
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
 */
export async function getJournalHeatMapData(
  userId: string,
  timeline: Timeline
): Promise<HeatMapResult> {
  const { startDate, endDate } = getDateRange(timeline);

  // Get journal entries with goal mention info (relational)
  const data = await db.query.journalEntries.findMany({
    columns: { id: true, entryDate: true },
    where: and(
      eq(journalEntries.userId, userId),
      gte(journalEntries.entryDate, startDate),
      lte(journalEntries.entryDate, endDate)
    ),
    orderBy: journalEntries.entryDate,
    with: {
      mentions: { columns: { goalId: true } },
    },
  });

  // Group by date
  const dateMap = new Map<string, { count: number; hasGoalMention: boolean }>();

  for (const entry of data) {
    const date = entry.entryDate;
    if (date === null) continue;
    const existing = dateMap.get(date) ?? { count: 0, hasGoalMention: false };
    existing.count++;
    if (entry.mentions && entry.mentions.length > 0) {
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
    totalEntries: data.length,
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
  userId: string,
  timeline: Timeline
): Promise<GoalActivityHeatMapResult> {
  const { startDate, endDate } = getDateRange(timeline);

  // Get all active/completed goals for user
  const goalsData = await db
    .select({ id: goals.id, title: goals.title })
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        inArray(goals.status, ['active', 'completed'])
      )
    )
    .orderBy(goals.createdAt);

  // Assign colors to goals
  const goalsWithColors: GoalInfo[] = goalsData.map((g, idx) => ({
    id: g.id,
    title: g.title,
    color: GOAL_COLORS[idx % GOAL_COLORS.length],
  }));

  // Get all journal entries with goal mentions in date range (relational)
  const entriesWithMentions = await db.query.journalEntries.findMany({
    columns: { entryDate: true },
    where: and(
      eq(journalEntries.userId, userId),
      gte(journalEntries.entryDate, startDate),
      lte(journalEntries.entryDate, endDate)
    ),
    with: {
      mentions: { columns: { goalId: true } },
    },
  });

  // Build activity map
  const activityByGoal: Record<string, string[]> = {};

  // Initialize all goals with empty arrays
  for (const goal of goalsWithColors) {
    activityByGoal[goal.id] = [];
  }

  // Populate with actual activity data from entries
  const goalDateSets: Record<string, Set<string>> = {};

  for (const entry of entriesWithMentions) {
    if (entry.entryDate === null) continue;
    const mentions = entry.mentions ?? [];
    for (const mention of mentions) {
      const goalId = mention.goalId;
      if (!goalDateSets[goalId]) {
        goalDateSets[goalId] = new Set();
      }
      goalDateSets[goalId].add(entry.entryDate);
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
