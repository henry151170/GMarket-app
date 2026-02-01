-- Function to reset (delete all) expenses and their journal entries
CREATE OR REPLACE FUNCTION reset_expenses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete all journal entries related to expenses
  DELETE FROM cash_journal WHERE type = 'expense';
  
  -- 2. Delete all expenses
  DELETE FROM expenses;
END;
$$;
