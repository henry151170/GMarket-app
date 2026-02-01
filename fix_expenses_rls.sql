-- FIX: RLS Policy for Expenses
-- Ensure workers can insert expenses and that the policy explicitly allows it.

-- 1. DROP EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Workers can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Workers insert own expenses" ON expenses;

-- 2. CREATE ROBUST INSERT POLICY
CREATE POLICY "Workers can insert expenses" ON expenses
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- 3. VERIFY/ENABLE RLS (Just in case)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 4. GRANT PERMISSIONS
-- Sometimes "public" role defaults don't include INSERT for new tables
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON expenses TO service_role;
