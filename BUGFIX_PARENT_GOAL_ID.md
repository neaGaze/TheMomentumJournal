# Parent Goal ID Column Missing - Fix Progress

## Error
```
Failed to update goal: Could not find the 'parent_goal_id' column of 'goals' in the schema cache
```

## Root Cause
Migration file created but not applied to Supabase database.

## Progress Log

### Iteration 1
**Status:** Starting
**Started:** 2026-01-31

#### Backend Engineer - Migration Analysis
- **Status:** Complete
- **Agent ID:** a83c141
- **Finding:** Migration file correct but not applied to Supabase database
- **Migration File:** `supabase/migrations/20260201000000_goal_linking.sql`
- **Action Required:** Manual application via Supabase Dashboard SQL Editor

**SQL to Apply:**
```sql
ALTER TABLE goals ADD COLUMN parent_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_parent_goal_id ON goals(parent_goal_id);
ALTER TABLE goals ADD CONSTRAINT chk_parent_goal_type CHECK (...);
CREATE OR REPLACE FUNCTION validate_goal_parent() RETURNS TRIGGER AS $$ ... $$;
CREATE TRIGGER validate_goal_parent_trigger BEFORE INSERT OR UPDATE ON goals ...;
```

**Instructions:**
1. Go to Supabase Dashboard → SQL Editor
2. Paste migration SQL
3. Click Run

#### Migration Application Attempts
- Supabase CLI: Not installed
- Node script: RPC exec function not available in Supabase
- Result: **Manual application required**

---

## ⚠️ USER ACTION REQUIRED

**The database migration MUST be applied manually:**

### Option 1: Supabase Dashboard (RECOMMENDED)

1. **Go to:** https://supabase.com/dashboard
2. **Select:** Your project (wqulqoolxcrfngnqzuha)
3. **Navigate:** SQL Editor (left sidebar)
4. **Create:** New Query
5. **Paste:** Full contents from `supabase/migrations/20260201000000_goal_linking.sql`
6. **Click:** Run (or press Cmd/Ctrl + Enter)

### Option 2: Install Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link project
supabase link --project-ref wqulqoolxcrfngnqzuha

# Push migrations
supabase db push
```

---

## After Migration Applied

Once you've run the SQL, return here and confirm. Then we'll:
1. Verify the schema
2. Test goal creation/linking
3. Complete the fix

**Status:** ⏸️ Waiting for user to apply migration...
