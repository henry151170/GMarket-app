-- Modified trigger function to handle both INSERT and UPDATE (Status Change)
create or replace function sync_expense_to_journal() returns trigger as $$
declare
  val_location text;
  val_type text;
begin
  -- 1. HANDLE INSERT
  IF (TG_OP = 'INSERT') THEN
      IF NEW.status = 'paid' THEN
          if new.is_structural then val_type := 'structural_expense'; else val_type := 'expense'; end if;
          
          if new.payment_method = 'cash' then
            if new.cash_location is not null then val_location := 'hand'; else val_location := 'hand'; end if;
          else
            val_location := 'bank';
          end if;

          insert into cash_journal (user_id, date, type, amount, description, location, currency, reference_id) 
          values (new.user_id, new.date, val_type, -abs(new.amount), new.description, val_location::cash_location, new.currency, new.id);
      END IF;
      RETURN NEW;
  END IF;

  -- 2. HANDLE UPDATE
  IF (TG_OP = 'UPDATE') THEN
      -- Case A: Pending -> Paid (Create Journal Entry)
      IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
          -- Force is_structural if needed? No, rely on what's in the row.
          -- (Ideally the update set is_structural=true too, but let's respect the current value)
          if new.is_structural then val_type := 'structural_expense'; else val_type := 'expense'; end if;
          
          if new.payment_method = 'cash' then
            if new.cash_location is not null then val_location := 'hand'; else val_location := 'hand'; end if;
          else
            val_location := 'bank';
          end if;

          insert into cash_journal (user_id, date, type, amount, description, location, currency, reference_id) 
          values (new.user_id, new.date, val_type, -abs(new.amount), new.description, val_location::cash_location, new.currency, new.id);
      
      -- Case B: Paid -> Pending (Remove Journal Entry)
      ELSIF OLD.status = 'paid' AND NEW.status = 'pending' THEN
          delete from cash_journal where reference_id = OLD.id;
      
      -- Case C: Paid -> Paid (Content Update) - Optional, but good for data consistency if amount/date changes
      ELSIF OLD.status = 'paid' AND NEW.status = 'paid' THEN
           -- If amount, date, or description changed, update journal
           UPDATE cash_journal
           SET 
             amount = -abs(NEW.amount),
             date = NEW.date,
             description = NEW.description
           WHERE reference_id = NEW.id;
      END IF;
      
      RETURN NEW;
  END IF;
  
  return null;
end;
$$ language plpgsql;

-- Create Trigger for UPDATE
DROP TRIGGER IF EXISTS on_expense_update ON expenses;
CREATE TRIGGER on_expense_update
  AFTER UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION sync_expense_to_journal();
