# The Momentum Journal - Implementation Plan (Phases 3-6)

## Current State Analysis

### Verified Complete
- **Infrastructure (Phase 1):** Next.js 14 setup, Tailwind, TypeScript config
- **Database:** Full schema with RLS policies (profiles, goals, journal_entries, journal_goal_mentions, ai_analyses, weekly_insights)
- **Auth (Phase 2):** Login, signup, forgot/reset password, protected routes via middleware

### Existing Patterns to Follow
- Server components by default, 'use client' for interactivity
- Supabase client: `@/lib/supabase/client` (browser) / `@/lib/supabase/server` (server)
- Route groups: `(auth)` for auth pages, `(dashboard)` for protected
- Form state: useState + local handlers (no form library used in auth despite react-hook-form in deps)
- Styling: Tailwind utility classes, consistent color scheme (blue-600 primary)
- Validation: client-side only currently

### Missing/Gaps
- No TypeScript types file (types/ dir empty)
- No lib/db queries layer
- No API routes for data mutations
- Dashboard is placeholder only
- No sidebar/layout for dashboard routes

---

## Architecture Decisions

1. **API Routes:** Use Next.js route handlers for mutations (POST/PUT/DELETE)
2. **Types:** Create shared types matching DB schema
3. **DB Layer:** Create lib/db/ with typed query functions
4. **Forms:** Use react-hook-form + zod for remaining features
5. **Dashboard Layout:** Shared layout with sidebar nav
6. **Markdown:** @uiw/react-md-editor already installed

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Schema mismatch | Generate types from existing SQL |
| AI cost runaway | Rate limiting, token caps |
| Complex state | Keep server components, minimal client state |
| Voice-to-text | Defer to Phase 7 (not in immediate scope) |

---

## Executable Plan

### Phase 3: Goals CRUD

#### Backend Tasks

**B3.1 Create TypeScript types**
- File: `src/types/database.ts`
- Define: Goal, JournalEntry, Profile, AIAnalysis, WeeklyInsight types
- Match DB schema exactly
- Completion: All types compile, match SQL schema

**B3.2 Create goals DB queries**
- File: `src/lib/db/goals.ts`
- Functions: getGoals, getGoalById, createGoal, updateGoal, deleteGoal, getGoalsByStatus
- Use server supabase client
- Completion: All functions typed and tested manually

**B3.3 Create goals API routes**
- Files: `src/app/api/goals/route.ts` (GET, POST), `src/app/api/goals/[id]/route.ts` (GET, PUT, DELETE)
- Validate with zod
- Return proper status codes
- Completion: All CRUD ops work via curl/Postman

#### UI/UX Tasks

**U3.1 Create dashboard layout with sidebar**
- File: `src/app/(dashboard)/layout.tsx`
- Sidebar with nav links: Dashboard, Goals, Journal, Insights
- Mobile responsive (collapsible)
- Completion: Layout renders, nav works

**U3.2 Create goals list page**
- File: `src/app/(dashboard)/goals/page.tsx`
- Server component, fetch goals
- Filter tabs: All, Active, Completed, Paused
- Empty state when no goals
- Completion: Page loads, shows goals or empty state

**U3.3 Create goal card component**
- File: `src/components/goals/goal-card.tsx`
- Display: title, description, type, category, progress, status, target date
- Progress bar visual
- Actions: edit, delete buttons
- Completion: Card renders with all goal fields

**U3.4 Create goal form component**
- File: `src/components/goals/goal-form.tsx`
- react-hook-form + zod validation
- Fields: title, description, type (dropdown), category, target_date, status
- Reusable for create/edit
- Completion: Form validates, submits successfully

**U3.5 Create new goal page**
- File: `src/app/(dashboard)/goals/new/page.tsx`
- Use goal-form component
- Redirect to goals list on success
- Completion: Can create goal, see it in list

**U3.6 Create edit goal page**
- File: `src/app/(dashboard)/goals/[id]/edit/page.tsx`
- Load existing goal, populate form
- Update on submit
- Completion: Can edit goal, changes persist

**U3.7 Add delete goal functionality**
- Confirmation modal
- DELETE API call
- Optimistic UI update
- Completion: Delete works, removed from list

**U3.8 Create goal detail page**
- File: `src/app/(dashboard)/goals/[id]/page.tsx`
- Show full goal info
- Link to related journal entries (placeholder for now)
- Edit/delete actions
- Completion: Page shows goal details

---

### Phase 4: Journal CRUD

#### Backend Tasks

**B4.1 Create journal DB queries**
- File: `src/lib/db/journal.ts`
- Functions: getEntries, getEntryById, createEntry, updateEntry, deleteEntry, getEntriesByDateRange
- Include goal mentions joins
- Completion: All functions work

**B4.2 Create journal API routes**
- Files: `src/app/api/journal/route.ts`, `src/app/api/journal/[id]/route.ts`
- Support mood and tags in payload
- Completion: CRUD ops functional

**B4.3 Create goal-mention linking logic**
- File: `src/lib/db/mentions.ts`
- Sync mentions when journal saved
- Parse content for @goal references or explicit selection
- Completion: Mentions created/deleted correctly

#### UI/UX Tasks

**U4.1 Create journal list page**
- File: `src/app/(dashboard)/journal/page.tsx`
- Calendar view or list view toggle
- Filter by date range
- Show mood emoji, tags
- Completion: Page loads entries

**U4.2 Create journal entry card**
- File: `src/components/journal/journal-card.tsx`
- Display: title, snippet, date, mood, tags
- Click to view full
- Completion: Cards render correctly

**U4.3 Create journal editor component**
- File: `src/components/journal/journal-editor.tsx`
- Use @uiw/react-md-editor
- Preview mode
- Completion: Markdown editing works

**U4.4 Create mood picker component**
- File: `src/components/journal/mood-picker.tsx`
- Emoji-based moods (5-6 options)
- Completion: Can select mood

**U4.5 Create tag input component**
- File: `src/components/journal/tag-input.tsx`
- Add/remove tags
- Suggestions from existing tags
- Completion: Tags work

**U4.6 Create goal linker component**
- File: `src/components/journal/goal-linker.tsx`
- Multi-select from active goals
- Completion: Can link goals to entry

**U4.7 Create new entry page**
- File: `src/app/(dashboard)/journal/new/page.tsx`
- Combine editor + mood + tags + goal linker
- Completion: Can create entry

**U4.8 Create edit entry page**
- File: `src/app/(dashboard)/journal/[id]/edit/page.tsx`
- Load existing, update
- Completion: Can edit

**U4.9 Create entry detail page**
- File: `src/app/(dashboard)/journal/[id]/page.tsx`
- Full markdown rendered
- Show linked goals
- Completion: Detail view works

---

### Phase 5: Dashboard

#### Backend Tasks

**B5.1 Create dashboard stats queries**
- File: `src/lib/db/stats.ts`
- Functions: getGoalStats, getJournalStats, getWeeklyProgress
- Aggregate queries
- Completion: Stats return correct counts

**B5.2 Create API route for stats**
- File: `src/app/api/stats/route.ts`
- Return dashboard data
- Completion: API returns stats

#### UI/UX Tasks

**U5.1 Enhance dashboard page**
- Update `src/app/(dashboard)/dashboard/page.tsx`
- Real stats from DB
- Completion: Shows actual counts

**U5.2 Create stats card component**
- File: `src/components/dashboard/stats-card.tsx`
- Reusable, supports icon/color variants
- Completion: Cards render

**U5.3 Create recent activity component**
- File: `src/components/dashboard/recent-activity.tsx`
- Latest 5 journal entries
- Latest goal updates
- Completion: Shows real data

**U5.4 Create goal progress summary**
- File: `src/components/dashboard/goal-progress.tsx`
- List active goals with progress bars
- Quick update progress slider
- Completion: Progress visible, updateable

**U5.5 Create weekly streak component**
- File: `src/components/dashboard/weekly-streak.tsx`
- Show journaling streak
- Visual calendar dots
- Completion: Streak displays

**U5.6 Add timeline filter**
- Dropdown: This Week, This Month, This Year
- Filter stats accordingly
- Completion: Stats change by filter

---

### Phase 6: AI Analysis

#### Backend Tasks

**B6.1 Create Claude API client**
- File: `src/lib/ai/claude.ts`
- Initialize Anthropic SDK
- Wrapper with error handling
- Completion: Client connects

**B6.2 Create analysis prompts**
- File: `src/lib/ai/prompts.ts`
- Prompt templates for: goal progress, journal sentiment, recommendations
- Completion: Prompts defined

**B6.3 Create analysis service**
- File: `src/lib/ai/analysis.ts`
- Functions: analyzeJournals, analyzeGoalProgress, generateRecommendations, generateWeeklyInsight
- Store results in ai_analyses table
- Completion: Analysis functions work

**B6.4 Create analysis API route**
- File: `src/app/api/analysis/route.ts`
- POST to trigger analysis
- Rate limiting (1 per hour?)
- Completion: Can trigger analysis

**B6.5 Create weekly insight cron/trigger**
- File: `src/app/api/cron/weekly-insight/route.ts`
- Vercel cron or manual trigger
- Generate and store weekly_insights
- Completion: Insights generated

#### UI/UX Tasks

**U6.1 Create insights page**
- File: `src/app/(dashboard)/insights/page.tsx`
- List past analyses
- Trigger new analysis button
- Completion: Page loads insights

**U6.2 Create analysis card component**
- File: `src/components/insights/analysis-card.tsx`
- Display insights JSONB nicely
- Expandable sections
- Completion: Cards readable

**U6.3 Create analyze button component**
- File: `src/components/insights/analyze-button.tsx`
- Loading state
- Cooldown display
- Completion: Button triggers analysis

**U6.4 Create recommendations component**
- File: `src/components/insights/recommendations.tsx`
- Actionable AI suggestions
- Link to relevant goals
- Completion: Recs display

**U6.5 Create weekly summary view**
- File: `src/components/insights/weekly-summary.tsx`
- Rendered weekly_insight data
- Achievements, improvements, goal updates
- Completion: Summary renders

**U6.6 Add AI insights to dashboard**
- Latest insight preview on dashboard
- Link to full insights page
- Completion: Dashboard shows AI section

---

## Deployment Tasks

**D1. Add environment validation**
- File: `src/lib/env.ts`
- Validate required env vars at startup
- Completion: App fails fast if missing vars

**D2. Add error boundary**
- File: `src/app/error.tsx`, `src/app/(dashboard)/error.tsx`
- Graceful error UI
- Completion: Errors show friendly message

**D3. Add loading states**
- Files: `src/app/(dashboard)/loading.tsx`, per-page loading
- Skeleton components
- Completion: Loading states visible

**D4. Add API rate limiting**
- Middleware or per-route
- Especially for AI endpoints
- Completion: Rate limits work

---

## Implementation Order (Dependencies)

```
Phase 3 (Goals):
B3.1 Types -> B3.2 DB Queries -> B3.3 API Routes
U3.1 Layout (parallel with backend)
U3.3 Card -> U3.4 Form
U3.2 List (needs B3.2, U3.3)
U3.5 New Page (needs U3.4, B3.3)
U3.6 Edit Page (needs U3.4, B3.3)
U3.7 Delete (needs B3.3)
U3.8 Detail Page

Phase 4 (Journal) - Start after Goals CRUD:
B4.1 -> B4.2 -> B4.3
U4.3 Editor (can start parallel)
U4.4, U4.5, U4.6 (parallel)
U4.2 Card -> U4.1 List
U4.7 New -> U4.8 Edit -> U4.9 Detail

Phase 5 (Dashboard) - Can overlap with Phase 4:
B5.1 -> B5.2
U5.2 Card -> U5.1 Dashboard
U5.3, U5.4, U5.5 (parallel)
U5.6 Filter

Phase 6 (AI) - Start after Journal complete:
B6.1 -> B6.2 -> B6.3 -> B6.4
B6.5 (after B6.3)
U6.1, U6.2, U6.3 (parallel with backend)
U6.4, U6.5 (after B6.3)
U6.6 (last)

Deployment tasks: Sprinkle throughout, D1 first
```

## Estimated Timeline (1 dev)

| Phase | Duration |
|-------|----------|
| Phase 3 | 3-4 days |
| Phase 4 | 3-4 days |
| Phase 5 | 2 days |
| Phase 6 | 3-4 days |
| Testing/Polish | 2 days |
| **Total** | ~2-3 weeks |

---

## Validation Strategy

### Per Phase
- **Phase 3:** Create goal, view in list, edit, delete, filter by status
- **Phase 4:** Create entry with markdown, mood, tags, link goal, view rendered
- **Phase 5:** Dashboard shows real counts, filters work
- **Phase 6:** Trigger analysis, view insights, check weekly generation

### End-to-End Flow
1. User signs up
2. Creates yearly goal "Read 24 books"
3. Creates monthly goal "Read 2 books" linked to yearly
4. Journals weekly about progress
5. AI analyzes and provides insights
6. Dashboard shows progress toward goals

---

## Files to Create Summary

```
src/types/
  database.ts

src/lib/db/
  goals.ts
  journal.ts
  mentions.ts
  stats.ts

src/lib/ai/
  claude.ts
  prompts.ts
  analysis.ts

src/lib/
  env.ts

src/app/api/
  goals/route.ts
  goals/[id]/route.ts
  journal/route.ts
  journal/[id]/route.ts
  stats/route.ts
  analysis/route.ts
  cron/weekly-insight/route.ts

src/app/(dashboard)/
  layout.tsx
  loading.tsx
  error.tsx
  goals/page.tsx
  goals/new/page.tsx
  goals/[id]/page.tsx
  goals/[id]/edit/page.tsx
  journal/page.tsx
  journal/new/page.tsx
  journal/[id]/page.tsx
  journal/[id]/edit/page.tsx
  insights/page.tsx

src/components/
  goals/goal-card.tsx
  goals/goal-form.tsx
  journal/journal-card.tsx
  journal/journal-editor.tsx
  journal/mood-picker.tsx
  journal/tag-input.tsx
  journal/goal-linker.tsx
  dashboard/stats-card.tsx
  dashboard/recent-activity.tsx
  dashboard/goal-progress.tsx
  dashboard/weekly-streak.tsx
  insights/analysis-card.tsx
  insights/analyze-button.tsx
  insights/recommendations.tsx
  insights/weekly-summary.tsx
  ui/sidebar.tsx
  ui/modal.tsx
```
