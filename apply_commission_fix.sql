-- ============================================================================
-- FIX: 4% COMMISSION FOR NON-CASH INCOMES (Bank Deposits)
-- ============================================================================

-- 1. CLEANUP CONFLICTING TRIGGERS
-- We drop any potential existing triggers/functions to ensure a clean slate.
DROP TRIGGER IF EXISTS tr_sync_income_journal ON public.income_payments;
DROP FUNCTION IF EXISTS public.sync_income_journal_entry();

DROP TRIGGER IF EXISTS tr_log_income_to_journal ON public.income_payments;
DROP FUNCTION IF EXISTS public.log_income_to_journal();

-- 2. CREATE NEW FUNCTION WITH COMMISSION LOGIC
CREATE OR REPLACE FUNCTION public.sync_income_journal_entry() RETURNS TRIGGER AS $$
DECLARE
  v_amount numeric;
  v_description text;
  v_location text;
  v_profile_exists boolean;
BEGIN
  -- Verify user exists in profiles to avoid foreign key errors
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT user_id FROM daily_incomes WHERE id = NEW.daily_income_id)) INTO v_profile_exists;
  
  -- LOGIC: 
  -- Cash -> Hand (100%)
  -- Everything else (Card, Yape, Transfer) -> Bank (96%) - 4% Commission Deducted
  
  IF NEW.method = 'cash' THEN 
    v_location := 'hand'; 
    v_amount := NEW.amount; -- 100%
  ELSE 
    v_location := 'bank'; 
    v_amount := NEW.amount * 0.96; -- 4% Commission Deducted
  END IF;
  
  v_description := 'Ingreso: ' || NEW.method;

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO cash_journal (
      date, amount, type, description, location, 
      user_id, reference_id, created_at
    )
    VALUES (
      NEW.created_at, 
      v_amount, 
      'income', 
      v_description, 
      v_location::cash_location, 
      (SELECT user_id FROM daily_incomes WHERE id = NEW.daily_income_id), 
      NEW.id, 
      NEW.created_at
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE cash_journal 
    SET 
      amount = v_amount, 
      location = v_location::cash_location,
      description = v_description
    WHERE reference_id = NEW.id AND type = 'income';
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM cash_journal WHERE reference_id = OLD.id AND type = 'income';
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE TRIGGER
CREATE TRIGGER tr_sync_income_journal 
AFTER INSERT OR UPDATE OR DELETE ON public.income_payments 
FOR EACH ROW EXECUTE PROCEDURE public.sync_income_journal_entry();

-- 4. RETROACTIVE FIX (Apply to existing data)
-- Updates any existing 'income' journal entry to match the new 4% rule.
UPDATE public.cash_journal cj
SET amount = ip.amount * 0.96
FROM public.income_payments ip
WHERE cj.reference_id = ip.id 
  AND cj.type = 'income'
  AND ip.method IN ('yape', 'transfer', 'card')
  -- Only update if the current amount is NOT already close to 96% (tolerance 0.01)
  -- This prevents re-updating correctly calculated rows
  AND ABS(cj.amount - (ip.amount * 0.96)) > 0.05;

-- 5. NOTIFY
NOTIFY pgrst, 'reload schema';
