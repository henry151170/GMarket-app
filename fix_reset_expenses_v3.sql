-- FIX V3: Comprehensive Fix for Delete History
-- Run this in SQL Editor

-- 1. Ensure policies exist for Deletion
-- Even if RLS is on, 'reset_expenses' as SECURITY DEFINER should bypass it, 
-- BUT let's add permissive policies for the authenticated user just in case
-- the function invocation context is tricky.

DO $$
BEGIN
    -- Policy for Expenses
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON expenses;
    CREATE POLICY "Enable delete for authenticated users" 
    ON expenses FOR DELETE 
    TO authenticated 
    USING (true); -- Allow deleting anything if you are authenticated (for now)

    -- Policy for Cash Journal
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON cash_journal;
    CREATE POLICY "Enable delete for authenticated users" 
    ON cash_journal FOR DELETE 
    TO authenticated 
    USING (true); 
END $$;

-- 2. Re-create the reset function with logging
CREATE OR REPLACE FUNCTION reset_expenses()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Force search path for security
AS $$
DECLARE
    deleted_journal_count INT;
    deleted_expenses_count INT;
BEGIN
    -- Delete journal entries
    DELETE FROM cash_journal WHERE type = 'expense';
    GET DIAGNOSTICS deleted_journal_count = ROW_COUNT;
    
    -- Delete expenses
    DELETE FROM expenses;
    GET DIAGNOSTICS deleted_expenses_count = ROW_COUNT;

    -- Raise notice for debugging (check specific 'Messages' tab in SQL Editor if running manually)
    RAISE NOTICE 'Deleted % journal entries and % expenses', deleted_journal_count, deleted_expenses_count;

    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error resetting expenses: %', SQLERRM;
    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expenses() TO service_role;

-- 3. Immediate sanity check (Uncomment to test immediately in SQL Editor)
-- SELECT reset_expenses();
