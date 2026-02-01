-- Fix for Reset Expenses functionality
-- Run this in the Supabase SQL Editor

-- 1. Drop the old function to be safe (optional but good practice if signature changes)
DROP FUNCTION IF EXISTS reset_expenses();

-- 2. Re-create the function with robust error handling and boolean return
CREATE OR REPLACE FUNCTION reset_expenses()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all journal entries related to expenses
  DELETE FROM cash_journal WHERE type = 'expense';
  
  -- Delete all expenses
  DELETE FROM expenses;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Log error (visible in Postgres logs)
  RAISE WARNING 'Error resetting expenses: %', SQLERRM;
  RETURN false;
END;
$$;

-- 3. CRITICAL: Grant permission to the authenticated user (your app)
GRANT EXECUTE ON FUNCTION reset_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expenses() TO service_role;
