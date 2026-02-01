-- FIX: Allow workers to write to cash_journal
-- This is necessary because:
-- 1. Triggers (even security definer) might need it if RLS is strict? (Actually security definer helps, but good to have)
-- 2. CRITICAL: The frontend useExpenses.ts MANUALLY inserts/deletes from cash_journal on updates/toggles.
--    So workers MUST have direct permissions.

ALTER TABLE cash_journal ENABLE ROW LEVEL SECURITY;

-- 1. Allow Viewing (Select)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cash_journal;
CREATE POLICY "Enable read access for authenticated users" ON cash_journal
FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow Inserting
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON cash_journal;
CREATE POLICY "Enable insert access for authenticated users" ON cash_journal
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow Deleting (for updates/toggles)
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON cash_journal;
CREATE POLICY "Enable delete access for authenticated users" ON cash_journal
FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Allow Updating (just in case)
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON cash_journal;
CREATE POLICY "Enable update access for authenticated users" ON cash_journal
FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. Grant Permissions
GRANT ALL ON cash_journal TO authenticated;
GRANT ALL ON cash_journal TO service_role;
