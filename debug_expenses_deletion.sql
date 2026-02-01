-- DEBUG SCRIPT: Check counts and RLS
-- Run this in SQL Editor

-- 1. Check counts
SELECT 'Before Delete' as stage, count(*) as expense_count FROM expenses;
SELECT 'Before Delete' as stage, count(*) as journal_count FROM cash_journal WHERE type = 'expense';

-- 2. Check RLS on expenses
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'expenses';

-- 3. Test a manual delete of ONE expense (if any exist) to see if it works
DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM expenses LIMIT 1;
    IF v_id IS NOT NULL THEN
        RAISE NOTICE 'Attempting to delete expense: %', v_id;
        
        -- Delete journal first
        DELETE FROM cash_journal WHERE reference_id = v_id;
        
        -- Delete expense
        DELETE FROM expenses WHERE id = v_id;
        
        IF NOT FOUND THEN
             RAISE NOTICE 'Delete returned no rows';
        ELSE
             RAISE NOTICE 'Delete successful';
        END IF;
    ELSE
        RAISE NOTICE 'No expenses found to test delete';
    END IF;
END $$;
