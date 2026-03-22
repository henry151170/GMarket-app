-- 1. Update Function to Check Payment Method
create or replace function log_other_income_to_journal() returns trigger as $$
declare
  v_location cash_location;
begin
  -- Determine location based on payment method
  if new.payment_method = 'cash' then
    v_location := 'hand';
  else
    v_location := 'bank';
  end if;

  insert into cash_journal (date, location, amount, type, reference_id, description, user_id)
  values (new.date, v_location, new.amount, 'other_income', new.id, 'Other Income: ' || new.description, new.user_id);
  
  return new;
end;
$$ language plpgsql;

-- 2. Retroactive Fix: Update existing journal entries
-- Update records that should be 'hand' but are 'bank'
update cash_journal cj
set location = 'hand'
from other_incomes oi
where cj.reference_id = oi.id
  and cj.type = 'other_income'
  and oi.payment_method = 'cash'
  and cj.location = 'bank';
