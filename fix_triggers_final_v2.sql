-- FINAL FIX V2
-- This script safely drops and recreates the expense trigger to ensure the "no field method" error is resolved.

-- 1. Drop existing trigger and function (CASCADE removes dependent triggers like tr_expense_journal)
DROP FUNCTION IF EXISTS log_expense_to_journal() CASCADE;

-- 2. Re-create the function with CORRECT column name (payment_method)
CREATE OR REPLACE FUNCTION log_expense_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc text; -- changed to text to be safe, will cast if enum exists
BEGIN
  -- CHECK STATUS: Only log if status is 'paid'
  -- If status column doesn't exist or is null, we assume 'paid' or check behavior.
  -- Expenses table has 'status' column as per previous tasks.
  IF NEW.status != 'paid' THEN
    RETURN NEW;
  END IF;

  -- CORRECTED COLUMN: payment_method (was method)
  IF NEW.payment_method = 'cash' THEN
    loc := NEW.cash_location;
  ELSE
    loc := 'bank';
  END IF;
  
  IF loc IS NULL THEN loc := 'bank'; END IF;

  INSERT INTO cash_journal (date, location, amount, type, reference_id, description)
  VALUES (NEW.date, loc::cash_location, -NEW.amount, 'expense', NEW.id, 'Gasto: ' || NEW.category);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger
CREATE TRIGGER trigger_log_new_expense
AFTER INSERT ON expenses
FOR EACH ROW EXECUTE FUNCTION log_expense_to_journal();

-- Verify: You should see "CREATE FUNCTION" and "CREATE TRIGGER" in results.
