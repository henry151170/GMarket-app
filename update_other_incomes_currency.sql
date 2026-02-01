-- Add Currency to Other Incomes and Update Trigger

-- 1. Add currency column
ALTER TABLE other_incomes 
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD'));

-- 2. Update Trigger Function to log currency
CREATE OR REPLACE FUNCTION log_other_income_to_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  loc text;
BEGIN
  -- Determine Location based on Method
  IF NEW.payment_method = 'cash' THEN
    loc := 'hand';
  ELSE
    loc := 'bank';
  END IF;

  INSERT INTO cash_journal (date, location, amount, type, reference_id, description, currency)
  VALUES (
      NEW.date, 
      loc::cash_location, 
      NEW.amount, 
      'other_income', 
      NEW.id, 
      'Other Income: ' || NEW.description,
      NEW.currency -- Pass the currency
  );
  
  RETURN NEW;
END;
$function$;
