-- Add payment_method column
ALTER TABLE other_incomes 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('cash', 'yape', 'card', 'transfer'));

-- 2. Update existing records (Default to 'cash' if null, or 'bank' if it was a loan? Let's default to cash for safety)
UPDATE other_incomes SET payment_method = 'cash' WHERE payment_method IS NULL;

-- 3. Update the Trigger Function
CREATE OR REPLACE FUNCTION log_other_income_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc text;
BEGIN
  -- Determine Location based on Method
  IF NEW.payment_method = 'cash' THEN
    loc := 'hand';
  ELSE
    loc := 'bank';
  END IF;

  INSERT INTO cash_journal (date, location, amount, type, reference_id, description)
  VALUES (NEW.date, loc::cash_location, NEW.amount, 'other_income', NEW.id, 'Other Income: ' || NEW.description);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. No need to recreate trigger if it already points to this function name, but let's be safe.
-- DROP TRIGGER IF EXISTS tr_other_income_journal ON other_incomes;
-- CREATE TRIGGER tr_other_income_journal AFTER INSERT ON other_incomes FOR EACH ROW EXECUTE FUNCTION log_other_income_to_journal();
