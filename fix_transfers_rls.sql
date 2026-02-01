-- Fix RLS for Fund Transfers
-- Enable RLS and add policies for authenticated users.

ALTER TABLE fund_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert their own transfers
DROP POLICY IF EXISTS "Users can insert own transfers" ON fund_transfers;
CREATE POLICY "Users can insert own transfers" ON fund_transfers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to view their own transfers
DROP POLICY IF EXISTS "Users can view own transfers" ON fund_transfers;
CREATE POLICY "Users can view own transfers" ON fund_transfers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Verify grants just in case
GRANT ALL ON fund_transfers TO authenticated;
-- Sequence grant removed as ID is UUID
