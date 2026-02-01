-- 1. Create Function to Log Other Incomes to Journal
create or replace function log_other_income_to_journal() returns trigger as $$
begin
  -- Assume 'bank' for now. 
  -- We treat this as 'other_income' type so it doesn't mess up Net Profit calculations 
  -- but DOES add to the Balance (Caja/Banco).
  
  insert into cash_journal (date, location, amount, type, reference_id, description)
  values (new.date, 'bank', new.amount, 'other_income', new.id, 'Other Income: ' || new.description);
  
  return new;
end;
$$ language plpgsql;

-- 2. Create Trigger
drop trigger if exists tr_other_income_journal on other_incomes;
create trigger tr_other_income_journal
  after insert on other_incomes
  for each row execute procedure log_other_income_to_journal();

-- 3. Backfill existing records (if any were created before this trigger)
insert into cash_journal (date, location, amount, type, reference_id, description)
select date, 'bank', amount, 'other_income', id, 'Other Income: ' || description
from other_incomes
where id not in (select reference_id from cash_journal where type = 'other_income');
