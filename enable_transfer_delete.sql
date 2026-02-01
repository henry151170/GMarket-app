-- Enable Deleting Transfers and Cascading to Journal

-- 1. Create Delete Trigger Function
CREATE OR REPLACE FUNCTION delete_transfer_journal() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM cash_journal 
    WHERE reference_id = OLD.id 
    AND type IN ('transfer_in', 'transfer_out');
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS tr_transfer_delete ON fund_transfers;
CREATE TRIGGER tr_transfer_delete
BEFORE DELETE ON fund_transfers
FOR EACH ROW
EXECUTE FUNCTION delete_transfer_journal();

-- 3. Add RLS Policy for DELETE
DROP POLICY IF EXISTS "Users can delete own transfers" ON fund_transfers;
CREATE POLICY "Users can delete own transfers" ON fund_transfers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
