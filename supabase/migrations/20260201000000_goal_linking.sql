-- Migration: Add parent_goal_id for linking short-term goals to long-term goals
-- One long-term goal can have multiple short-term goals (one-to-many)
-- One short-term goal can have only one long-term goal (many-to-one)

-- Add parent_goal_id column to goals table
ALTER TABLE goals ADD COLUMN parent_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- Create index for faster lookups of child goals
CREATE INDEX idx_goals_parent_goal_id ON goals(parent_goal_id);

-- Add constraint: Only short-term goals can have a parent goal
-- Constraint ensures parent_goal_id is NULL for long-term goals
ALTER TABLE goals ADD CONSTRAINT chk_parent_goal_type
  CHECK (
    (type = 'long-term' AND parent_goal_id IS NULL) OR
    (type = 'short-term')
  );

-- Function to validate parent goal is long-term and belongs to same user
CREATE OR REPLACE FUNCTION validate_goal_parent()
RETURNS TRIGGER AS $$
DECLARE
  parent_type TEXT;
  parent_user_id UUID;
BEGIN
  -- Only validate if parent_goal_id is set
  IF NEW.parent_goal_id IS NOT NULL THEN
    -- Get parent goal info
    SELECT type, user_id INTO parent_type, parent_user_id
    FROM goals
    WHERE id = NEW.parent_goal_id;

    -- Check parent exists
    IF parent_type IS NULL THEN
      RAISE EXCEPTION 'Parent goal does not exist';
    END IF;

    -- Verify parent is long-term
    IF parent_type != 'long-term' THEN
      RAISE EXCEPTION 'Parent goal must be a long-term goal';
    END IF;

    -- Verify same user owns both goals
    IF parent_user_id != NEW.user_id THEN
      RAISE EXCEPTION 'Parent goal must belong to the same user';
    END IF;

    -- Prevent circular reference (goal cannot be its own parent)
    IF NEW.id = NEW.parent_goal_id THEN
      RAISE EXCEPTION 'Goal cannot be its own parent';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation on insert and update
CREATE TRIGGER validate_goal_parent_trigger
  BEFORE INSERT OR UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION validate_goal_parent();

-- Comment for documentation
COMMENT ON COLUMN goals.parent_goal_id IS 'Reference to long-term goal for short-term goals. NULL for long-term goals.';
