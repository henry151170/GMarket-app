-- 1. Create Function to Log Purchases to Journal
create or replace function log_purchase_to_journal() returns trigger as $$
declare
  v_location cash_location;
begin
  -- Determine location based on payment method
  if new.payment_method = 'cash' then
    v_location := 'hand';
  else
    v_location := 'bank';
  end if;

  -- Insert Negative Amount for Outflow
  insert into cash_journal (date, location, amount, type, reference_id, description, user_id)
  values (new.date, v_location, -abs(new.total_amount), 'purchase', new.id, 'Purchase: ' || COALESCE(new.provider_name, 'Unknown'), new.user_id);
  
  return new;
end;
$$ language plpgsql;

-- 2. Create Trigger
drop trigger if exists tr_purchase_journal on purchases;
create trigger tr_purchase_journal
  after insert on purchases
  for each row execute procedure log_purchase_to_journal();

-- 3. Backfill existing records
insert into cash_journal (date, location, amount, type, reference_id, description, user_id)
select 
  date, 
  case when payment_method = 'cash' then 'hand'::cash_location else 'bank'::cash_location end, 
  -abs(total_amount), 
  'purchase', 
  id, 
  'Purchase: ' || COALESCE(provider_name, 'Unknown'),
  user_id
from purchases
where id not in (select reference_id from cash_journal where type = 'purchase');
