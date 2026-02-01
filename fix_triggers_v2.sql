-- FIX: Correct column name in Expense Trigger (method -> payment_method)

-- 1. Expense Trigger (CORRECTED)
CREATE OR REPLACE FUNCTION log_expense_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc cash_location;
BEGIN
  -- ERROR WAS HERE: "NEW.method" should be "NEW.payment_method"
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

-- 2. Income Trigger (Verified: Table 'income_payments' uses 'method', so this is fine, but re-applying to be safe)
CREATE OR REPLACE FUNCTION log_income_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc cash_location;
  is_relevant boolean := false;
BEGIN
  -- Table 'income_payments' DOES use 'method', so this was correct.
  IF NEW.method = 'cash' THEN
    loc := NEW.cash_location;
    is_relevant := true;
  ELSE
    loc := 'bank'; 
    is_relevant := true;
  END IF;

  IF is_relevant THEN
    INSERT INTO cash_journal (date, location, amount, type, reference_id, description)
    VALUES (now(), loc, NEW.amount, 'income', NEW.id, 'Ingreso: ' || NEW.method);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
