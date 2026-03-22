-- 1. Add Column (Safe if exists)
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'expenses' and column_name = 'is_structural') then
        alter table expenses add column is_structural boolean default false;
    end if;
end $$;

-- 2. Update Function to set Type based on is_structural
create or replace function sync_expense_to_journal() returns trigger as $$
declare
    loc_value cash_location;
    pay_method text;
    journal_type text;
begin
    -- Determine Payment Method
    pay_method := NEW.payment_method;
    
    -- Determine Location
    IF pay_method IN ('transfer', 'yape', 'card') THEN
        loc_value := 'bank';
    ELSE
        -- If cash, use provided location OR default to hand
        IF NEW.cash_location IS NOT NULL THEN
            loc_value := NEW.cash_location;
        ELSE
            loc_value := 'hand';
        END IF;
    END IF;

    -- Determine Type based on is_structural flag
    -- TRUE = 'structural_expense' (Subtracts from Dashboard Cash)
    -- FALSE = 'expense' (Ignored in Dashboard Cash, assumed deducted from Daily Count)
    IF NEW.is_structural IS TRUE THEN
        journal_type := 'structural_expense';
    ELSE
        journal_type := 'expense';
    END IF;

    -- Insert into Journal
    INSERT INTO cash_journal (user_id, date, type, amount, description, location, currency, reference_id) 
    VALUES (NEW.user_id, NEW.date, journal_type, -ABS(NEW.amount), COALESCE(NEW.description, 'Gasto'), loc_value, COALESCE(NEW.currency, 'PEN'), NEW.id);
    
    RETURN NEW;
end;
$$ language plpgsql;

-- 3. Update Trigger to ensure it uses the new function (idempotent)
drop trigger if exists on_expense_insert on expenses;
create trigger on_expense_insert
  after insert on expenses
  for each row execute procedure sync_expense_to_journal();

-- 4. Re-create Delete Trigger (to handle both types)
create or replace function delete_expense_journal_entry() returns trigger as $$
begin
    delete from cash_journal 
    where reference_id = OLD.id 
      and type IN ('expense', 'structural_expense');
    return OLD;
end;
$$ language plpgsql;

drop trigger if exists on_expense_delete on expenses;
create trigger on_expense_delete
  after delete on expenses
  for each row execute procedure delete_expense_journal_entry();
