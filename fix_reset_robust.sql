-- Function to reset (delete all) expenses and their journal entries
CREATE OR REPLACE FUNCTION reset_expenses()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Delete all journal entries related to expenses
  DELETE FROM cash_journal WHERE type = 'expense';
  
  -- 2. Delete all expenses
  -- Using DELETE instead of TRUNCATE to avoid permission issues with TRUNCATE on some setups, 
  -- but DELETE is fine since we checked constraints.
  DELETE FROM expenses;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION reset_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expenses() TO service_role;
