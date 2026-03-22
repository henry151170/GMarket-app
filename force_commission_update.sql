-- ============================================================================
-- FORCE FIX: COMMISSION LOGIC & DATA CLEANUP
-- Problem: 4% Commission not applying to Yape/Transfer
-- Strategy: Drop/Recreate Trigger + Update Existing Data
-- ============================================================================

-- 1. DROP EXISTING TRIGGER & FUNCTION (Clean Slate)
-- =================================================
drop trigger if exists tr_sync_income_journal on public.income_payments;
drop function if exists public.sync_income_journal_entry();

-- 2. RECREATE FUNCTION (Correct Logic)
-- ====================================
create or replace function public.sync_income_journal_entry() returns trigger as $$
declare
  v_amount numeric;
  v_description text;
  v_location text;
begin
  -- LOGIC: 
  -- Cash -> Hand (100%)
  -- Everything else (Card, Yape, Transfer) -> Bank (96%)
  
  if NEW.method = 'cash' then 
    v_location := 'hand'; 
    v_amount := NEW.amount; -- 100%
  else 
    v_location := 'bank'; 
    v_amount := NEW.amount * 0.96; -- 4% Commission
  end if;
  
  v_description := 'Ingreso: ' || NEW.method;

  if (TG_OP = 'INSERT') then
    insert into cash_journal (
      date, amount, type, description, location, 
      user_id, reference_id, created_at, currency
    )
    values (
      NEW.created_at, 
      v_amount, 
      'income', 
      v_description, 
      v_location::cash_location, 
      (select user_id from daily_incomes where id = NEW.daily_income_id), 
      NEW.id, 
      NEW.created_at, 
      'PEN'
    );
    return NEW;
    
  elsif (TG_OP = 'UPDATE') then
    update cash_journal 
    set 
      amount = v_amount, 
      location = v_location::cash_location
    where reference_id = NEW.id and type = 'income';
    return NEW;
    
  elsif (TG_OP = 'DELETE') then
    delete from cash_journal where reference_id = OLD.id and type = 'income';
    return OLD;
  end if;
  
  return NULL;
end;
$$ language plpgsql;

-- 3. RECREATE TRIGGER
-- ===================
create trigger tr_sync_income_journal 
after insert or update or delete on public.income_payments 
for each row execute procedure public.sync_income_journal_entry();

-- 4. FIX EXISTING DATA (Retroactive Fix)
-- ======================================
-- Updates any existing journal entry for Yape/Transfer/Card that has the wrong amount (100% instead of 96%)
update public.cash_journal cj
set amount = ip.amount * 0.96
from public.income_payments ip
where cj.reference_id = ip.id 
  and cj.type = 'income'
  and ip.method in ('yape', 'transfer', 'card')
  and abs(cj.amount) > (ip.amount * 0.96 + 0.01); -- Margin of error check

-- 5. CONFIRMATION
NOTIFY pgrst, 'reload schema';
