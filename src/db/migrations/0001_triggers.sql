-- Hand-written triggers (Drizzle doesn't model triggers).
-- Applied after generated migrations by `npm run db:setup` (apply-triggers.ts).
-- NO RLS, NO handle_new_user (dropped in the local migration).

-- updated_at maintenance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Goal parent validation (unchanged from 20260201000000_goal_linking.sql)
CREATE OR REPLACE FUNCTION validate_goal_parent()
RETURNS TRIGGER AS $$
DECLARE
  parent_type TEXT;
  parent_user_id UUID;
BEGIN
  IF NEW.parent_goal_id IS NOT NULL THEN
    SELECT type, user_id INTO parent_type, parent_user_id
    FROM goals
    WHERE id = NEW.parent_goal_id;

    IF parent_type IS NULL THEN
      RAISE EXCEPTION 'Parent goal does not exist';
    END IF;

    IF parent_type != 'long-term' THEN
      RAISE EXCEPTION 'Parent goal must be a long-term goal';
    END IF;

    IF parent_user_id != NEW.user_id THEN
      RAISE EXCEPTION 'Parent goal must belong to the same user';
    END IF;

    IF NEW.id = NEW.parent_goal_id THEN
      RAISE EXCEPTION 'Goal cannot be its own parent';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_goal_parent_trigger ON goals;
CREATE TRIGGER validate_goal_parent_trigger
  BEFORE INSERT OR UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION validate_goal_parent();
