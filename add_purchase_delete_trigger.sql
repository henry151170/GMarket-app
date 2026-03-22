-- 1. Create Function to Handle Purchase Deletion
create or replace function handle_purchase_deletion() returns trigger as $$
begin
  -- Delete corresponding entry from cash_journal
  delete from cash_journal
  where reference_id = old.id
    and type = 'purchase';
  
  return old;
end;
$$ language plpgsql;

-- 2. Create Trigger
drop trigger if exists tr_purchase_delete_journal on purchases;
create trigger tr_purchase_delete_journal
  after delete on purchases
  for each row execute procedure handle_purchase_deletion();

-- 3. Cleanup Orphans (One-time fix)
delete from cash_journal
where type = 'purchase'
  and reference_id not in (select id from purchases);
