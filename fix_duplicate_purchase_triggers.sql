-- 1. Drop Duplicate Triggers
drop trigger if exists sync_purchase_to_journal on purchases;
drop function if exists sync_purchase_to_journal();

drop trigger if exists on_purchase_delete on purchases;
-- drop function if exists delete_journal_entry_by_origin(); -- Careful, might be used elsewhere? Let's check or just drop trigger.

-- 2. Cleanup Duplicate Entries in Cash Journal
-- Strategy: Delete entries with type 'expense' that have an origin_id present in purchases table
-- (Since my new trigger uses 'purchase' type and reference_id, NOT origin_id)
-- The old trigger used 'origin_id' = NEW.id.
-- My new trigger uses 'reference_id' = NEW.id.

DELETE FROM cash_journal
WHERE type = 'expense'
  AND origin_id IN (SELECT id FROM purchases);

-- Also safety check: Delete 'expense' types that have same ID as a 'purchase' type? 
-- No, they have different IDs. 
-- The old trigger inserted with origin_id = purchase.id.
-- Let's verify if 'origin_id' column is used by anything else correctly.
-- Transfers might use it?
