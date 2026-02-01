-- FIX CALENDAR VISIBILITY
-- The app cannot see the sales data because of permissions (RLS).
-- Run this script to ALLOW the app to read 'daily_incomes'.

ALTER TABLE daily_incomes ENABLE ROW LEVEL SECURITY;

-- 1. Reset Select Policies
DROP POLICY IF EXISTS "Workers view own incomes" ON daily_incomes;
DROP POLICY IF EXISTS "Admins view all incomes" ON daily_incomes;
DROP POLICY IF EXISTS "View incomes policy" ON daily_incomes;
DROP POLICY IF EXISTS "Users can view own incomes" ON daily_incomes;

-- 2. Create a Permissive Reading Policy
CREATE POLICY "Allow Reading Incomes"
ON daily_incomes FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. Also fix other_incomes just in case
ALTER TABLE other_incomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own other incomes" ON other_incomes;

CREATE POLICY "Allow Reading Other Incomes"
ON other_incomes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

GRANT SELECT ON daily_incomes TO authenticated;
GRANT SELECT ON other_incomes TO authenticated;
