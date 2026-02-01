-- FIX V6 (NUCLEAR): Force Delete by Disabling RLS temporarily
-- This bypasses ALL permissions checks.
-- Run this in SQL Editor

BEGIN;

    -- 1. Disable RLS temporarily (bypass all policies)
    ALTER TABLE cash_journal DISABLE ROW LEVEL SECURITY;
    ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

    -- 2. Delete everything manually
    -- (The order matters due to Foreign Keys)
    DELETE FROM cash_journal WHERE type = 'expense';
    DELETE FROM expenses;

    -- 3. Re-enable RLS
    ALTER TABLE cash_journal ENABLE ROW LEVEL SECURITY;
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

    -- If we got here, it worked.
    SELECT 'Deleted successfully' as status;

COMMIT;
