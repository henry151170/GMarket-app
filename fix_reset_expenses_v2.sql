-- FIXED Reset Expenses Function
-- This version simplifies the deletion to avoid foreign key issues
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS reset_expenses();

CREATE OR REPLACE FUNCTION reset_expenses()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete expenses. 
  -- IF you have ON DELETE CASCADE set up on cash_journal, this is all you need.
  -- IF NOT, we delete manually.
  
  -- Attempt to delete journal entries linked to expenses first
  DELETE FROM cash_journal WHERE type = 'expense';
  
  -- Then delete the expenses themselves
  DELETE FROM expenses;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error resetting expenses: %', SQLERRM;
  RETURN false;
END;
$$;

-- Grant permissions (Crucial)
GRANT EXECUTE ON FUNCTION reset_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expenses() TO service_role;
