-- FIX V4 (DEBUG): Un-silence the error
-- Run this in SQL Editor

-- We are removing the EXCEPTION block so the REAL error 
-- is sent to the application.

CREATE OR REPLACE FUNCTION reset_expenses()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Try to delete journal entries first
    DELETE FROM cash_journal WHERE type = 'expense';
    
    -- 2. Try to delete expenses
    DELETE FROM expenses;

    RETURN true;
    -- No EXCEPTION block! We want it to crash if there is an error
    -- so we can see the message in the App.
END;
$$;

GRANT EXECUTE ON FUNCTION reset_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expenses() TO service_role;
