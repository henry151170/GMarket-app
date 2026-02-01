-- FIX V5 (FINAL): Permissions Reset
-- This script forcefully fixes the "Silent Failure" where the database lies about deleting data.

-- 1. Reset permissions for Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Delete expenses policy" ON expenses;
DROP POLICY IF EXISTS "Allow Delete Expenses" ON expenses;

-- Create a policy that explicitly says "Authenticated users can delete EVERYTHING"
CREATE POLICY "Allow All Delete Expenses" 
ON expenses FOR DELETE 
TO authenticated 
USING (true);


-- 2. Reset permissions for Cash Journal (Critical because expenses link to this)
ALTER TABLE cash_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON cash_journal;
DROP POLICY IF EXISTS "Policy Delete Journal" ON cash_journal;
DROP POLICY IF EXISTS "Allow Delete Journal" ON cash_journal;

-- Create value policy for Journal
CREATE POLICY "Allow All Delete Journal" 
ON cash_journal FOR DELETE 
TO authenticated 
USING (true);


-- 3. Re-create the function one last time (checking permissions)
CREATE OR REPLACE FUNCTION reset_expenses()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM cash_journal WHERE type = 'expense';
    DELETE FROM expenses;
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expenses() TO service_role;
