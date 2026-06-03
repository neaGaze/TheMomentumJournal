import { sql, relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';

// ============================================
// users (replaces auth.users + profiles)
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// goals
// ============================================
export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    type: text('type').notNull(),
    category: text('category'),
    targetDate: date('target_date'),
    status: text('status').default('active'),
    progressPercentage: integer('progress_percentage').default(0),
    parentGoalId: uuid('parent_goal_id').references((): any => goals.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_goals_user_id').on(t.userId),
    index('idx_goals_status').on(t.status),
    index('idx_goals_type').on(t.type),
    index('idx_goals_parent_goal_id').on(t.parentGoalId),
    check('goals_type_check', sql`${t.type} IN ('long-term', 'short-term')`),
    check(
      'goals_status_check',
      sql`${t.status} IN ('active', 'completed', 'paused', 'abandoned')`
    ),
    check(
      'goals_progress_percentage_check',
      sql`${t.progressPercentage} >= 0 AND ${t.progressPercentage} <= 100`
    ),
    check(
      'chk_parent_goal_type',
      sql`(${t.type} = 'long-term' AND ${t.parentGoalId} IS NULL) OR (${t.type} = 'short-term')`
    ),
  ]
);

// ============================================
// journal_entries
// ============================================
export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    content: text('content').notNull(),
    entryDate: date('entry_date').default(sql`CURRENT_DATE`),
    mood: text('mood'),
    tags: text('tags').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_journal_entries_user_id').on(t.userId),
    index('idx_journal_entries_date').on(t.entryDate.desc()),
  ]
);

// ============================================
// journal_goal_mentions
// ============================================
export const journalGoalMentions = pgTable(
  'journal_goal_mentions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    journalEntryId: uuid('journal_entry_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    mentionedExplicitly: boolean('mentioned_explicitly').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique('journal_goal_mentions_journal_entry_id_goal_id_key').on(
      t.journalEntryId,
      t.goalId
    ),
  ]
);

// ============================================
// ai_analyses
// ============================================
export const aiAnalyses = pgTable(
  'ai_analyses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    analysisType: text('analysis_type').notNull(),
    journalEntriesAnalyzed: uuid('journal_entries_analyzed').array().notNull(),
    goalsAnalyzed: uuid('goals_analyzed').array().notNull(),
    insights: jsonb('insights').notNull(),
    recommendations: jsonb('recommendations'),
    progressSummary: jsonb('progress_summary'),
    tokensUsed: integer('tokens_used'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_ai_analyses_user_id').on(t.userId),
    check(
      'ai_analyses_analysis_type_check',
      sql`${t.analysisType} IN ('on-demand', 'weekly', 'monthly')`
    ),
  ]
);

// ============================================
// weekly_insights
// ============================================
export const weeklyInsights = pgTable(
  'weekly_insights',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weekStartDate: date('week_start_date').notNull(),
    weekEndDate: date('week_end_date').notNull(),
    summary: text('summary').notNull(),
    keyAchievements: jsonb('key_achievements'),
    areasForImprovement: jsonb('areas_for_improvement'),
    goalProgressUpdates: jsonb('goal_progress_updates'),
    aiAnalysisId: uuid('ai_analysis_id').references(() => aiAnalyses.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_weekly_insights_user_id_date').on(
      t.userId,
      t.weekStartDate.desc()
    ),
    unique('weekly_insights_user_id_week_start_date_key').on(
      t.userId,
      t.weekStartDate
    ),
  ]
);

// ============================================
// Relations
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  goals: many(goals),
  journalEntries: many(journalEntries),
  aiAnalyses: many(aiAnalyses),
  weeklyInsights: many(weeklyInsights),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  parent: one(goals, {
    fields: [goals.parentGoalId],
    references: [goals.id],
    relationName: 'goal_parent',
  }),
  children: many(goals, { relationName: 'goal_parent' }),
  mentions: many(journalGoalMentions),
}));

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    user: one(users, {
      fields: [journalEntries.userId],
      references: [users.id],
    }),
    mentions: many(journalGoalMentions),
  })
);

export const journalGoalMentionsRelations = relations(
  journalGoalMentions,
  ({ one }) => ({
    journalEntry: one(journalEntries, {
      fields: [journalGoalMentions.journalEntryId],
      references: [journalEntries.id],
    }),
    goal: one(goals, {
      fields: [journalGoalMentions.goalId],
      references: [goals.id],
    }),
  })
);

export const aiAnalysesRelations = relations(aiAnalyses, ({ one, many }) => ({
  user: one(users, { fields: [aiAnalyses.userId], references: [users.id] }),
  weeklyInsights: many(weeklyInsights),
}));

export const weeklyInsightsRelations = relations(weeklyInsights, ({ one }) => ({
  user: one(users, { fields: [weeklyInsights.userId], references: [users.id] }),
  aiAnalysis: one(aiAnalyses, {
    fields: [weeklyInsights.aiAnalysisId],
    references: [aiAnalyses.id],
  }),
}));

// ============================================
// Inferred types
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalGoalMention = typeof journalGoalMentions.$inferSelect;
export type NewJournalGoalMention = typeof journalGoalMentions.$inferInsert;
export type AIAnalysis = typeof aiAnalyses.$inferSelect;
export type NewAIAnalysis = typeof aiAnalyses.$inferInsert;
export type WeeklyInsight = typeof weeklyInsights.$inferSelect;
export type NewWeeklyInsight = typeof weeklyInsights.$inferInsert;
