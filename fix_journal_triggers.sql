-- FIX: Make journal logging triggers SECURITY DEFINER
-- This allows workers to "log" to the cash_journal (via the trigger) 
-- without needing direct INSERT permissions on the sensitive cash_journal table.

-- 1. Income Trigger
CREATE OR REPLACE FUNCTION log_income_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc cash_location;
  is_relevant boolean := false;
BEGIN
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

-- 2. Expense Trigger
CREATE OR REPLACE FUNCTION log_expense_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc cash_location;
BEGIN
  IF NEW.method = 'cash' THEN
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

-- 3. Transfer Trigger
CREATE OR REPLACE FUNCTION log_transfer_to_journal() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO cash_journal (date, location, amount, type, reference_id, description)
  VALUES (NEW.date, NEW.origin, -NEW.amount, 'transfer_out', NEW.id, 'Transferencia a ' || NEW.destination);
  
  INSERT INTO cash_journal (date, location, amount, type, reference_id, description)
  VALUES (NEW.date, NEW.destination, NEW.amount, 'transfer_in', NEW.id, 'Transferencia desde ' || NEW.origin);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
