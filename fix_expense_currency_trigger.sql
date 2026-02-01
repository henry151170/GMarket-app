-- Fix Expense Trigger to log currency correctly

CREATE OR REPLACE FUNCTION log_expense_to_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  loc text;
BEGIN
  -- CHECK STATUS: Only log if status is 'paid'
  IF NEW.status != 'paid' THEN
    RETURN NEW;
  END IF;

  -- Determine Location
  IF NEW.payment_method = 'cash' THEN
    loc := NEW.cash_location;
  ELSE
    loc := 'bank';
  END IF;
  
  -- Default location fallback
  IF loc IS NULL THEN loc := 'bank'; END IF;

  -- Insert into journal with CURRENCY
  INSERT INTO cash_journal (date, location, amount, type, reference_id, description, currency)
  VALUES (
      NEW.date, 
      loc::cash_location, 
      -NEW.amount, 
      'expense', 
      NEW.id, 
      'Gasto: ' || NEW.category,
      NEW.currency -- Pass the currency
  );
  
  RETURN NEW;
END;
$function$;
