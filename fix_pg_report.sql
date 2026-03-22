-- ============================================================================
-- FIX: P&G REPORT ERROR (Missing Column & Logic)
-- ============================================================================

-- 1. ADD MISSING COLUMN (If not exists)
-- We use TEXT with check constraint to match the enum values being used in code
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'other_incomes' AND column_name = 'payment_method') THEN
    ALTER TABLE public.other_incomes 
    ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'yape', 'card', 'transfer'));
  END IF;
END $$;

-- 2. UPDATE EXISTING RECORDS
-- Default null payment methods to 'cash' so the report doesn't break on nulls
UPDATE public.other_incomes 
SET payment_method = 'cash' 
WHERE payment_method IS NULL;

-- 3. UPDATE TRIGGER FUNCTION
-- Ensure connection to Cash Journal uses the correct location (Hand vs Bank)
CREATE OR REPLACE FUNCTION public.log_other_income_to_journal() RETURNS TRIGGER AS $$
DECLARE
  v_location cash_location;
BEGIN
  -- Determine location based on payment method
  IF NEW.payment_method = 'cash' THEN
    v_location := 'hand';
  ELSE
    v_location := 'bank';
  END IF;

  -- Insert into Cash Journal
  INSERT INTO public.cash_journal (
    date, 
    location, 
    amount, 
    type, 
    reference_id, 
    description, 
    user_id
  )
  VALUES (
    NEW.date, 
    v_location, 
    NEW.amount, 
    'other_income', 
    NEW.id, 
    'Other Income: ' || COALESCE(NEW.description, ''), 
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECREATE TRIGGER
DROP TRIGGER IF EXISTS tr_other_income_journal ON public.other_incomes;
CREATE TRIGGER tr_other_income_journal 
AFTER INSERT ON public.other_incomes 
FOR EACH ROW EXECUTE PROCEDURE public.log_other_income_to_journal();

-- 5. RETROACTIVE FIX FOR JOURNAL ENTRIES
-- Fix any existing entries in cash_journal that might be misclassified
UPDATE public.cash_journal cj
SET location = 'hand'::cash_location
FROM public.other_incomes oi
WHERE cj.reference_id = oi.id
  AND cj.type = 'other_income'
  AND oi.payment_method = 'cash';

UPDATE public.cash_journal cj
SET location = 'bank'::cash_location
FROM public.other_incomes oi
WHERE cj.reference_id = oi.id
  AND cj.type = 'other_income'
  AND oi.payment_method IN ('yape', 'transfer', 'card');

-- 6. CONFIRMATION
NOTIFY pgrst, 'reload schema';
