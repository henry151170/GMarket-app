-- Update the log_expense_to_journal function to check for status = 'paid'

CREATE OR REPLACE FUNCTION log_expense_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc cash_location;
BEGIN
  -- CHECK STATUS: Only log if status is 'paid'
  IF NEW.status != 'paid' THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_method = 'cash' THEN
    loc := NEW.cash_location;
  ELSE
    loc := 'bank';
  END IF;
  
  IF loc IS NULL THEN loc := 'bank'; END IF;

  INSERT INTO cash_journal (date, location, amount, type, reference_id, description)
  VALUES (NEW.date, loc, -NEW.amount, 'expense', NEW.id, 'Gasto: ' || NEW.category);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists (Re-creation on existing table if needed)
-- We assume the trigger 'trigger_log_new_expense' already exists on 'expenses'.
-- If not, we can create it. Safe to ignore if it works, but better to be sure.
-- DROP TRIGGER IF EXISTS trigger_log_new_expense ON expenses;
-- CREATE TRIGGER trigger_log_new_expense
-- AFTER INSERT ON expenses
-- FOR EACH ROW EXECUTE FUNCTION log_expense_to_journal();
