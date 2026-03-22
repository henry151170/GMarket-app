-- ============================================================================
-- UPDATE: COMMISSION LOGIC (4% FOR ALL DIGITAL)
-- Request: "revisa el saldo... debe ingresar el monto menos el 4% (yape/tarjeta/transferencia)"
-- Change: Apply 0.96 factor to Yape and Transfer (previously only Card).
-- ============================================================================

create or replace function sync_income_journal_entry() returns trigger as $$
declare
  v_amount numeric;
  v_description text;
  v_location text;
begin
  -- LOGIC UPDATE:
  -- Cash -> Hand (100%)
  -- Yape/Card/Transfer -> Bank (96%)
  
  if NEW.method = 'cash' then 
    v_location := 'hand'; 
    v_amount := NEW.amount; -- 100%
  else 
    v_location := 'bank'; 
    v_amount := NEW.amount * 0.96; -- 4% Commission for ALL digital methods
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

-- RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
