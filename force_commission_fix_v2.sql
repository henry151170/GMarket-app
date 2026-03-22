-- ============================================================================
-- FORCE FIX V2: CORRECT LOCATION & AMOUNT FOR BANK DEPOSITS
-- ============================================================================

-- 1. RE-APPLY TRIGGER (Just to be 100% sure it's latest version)
CREATE OR REPLACE FUNCTION public.sync_income_journal_entry() RETURNS TRIGGER AS $$
DECLARE
  v_amount numeric;
  v_description text;
  v_location text;
  v_profile_exists boolean;
BEGIN
  -- Verify user exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT user_id FROM daily_incomes WHERE id = NEW.daily_income_id)) INTO v_profile_exists;
  
  -- LOGIC: 
  -- Cash -> Hand (100%)
  -- Everything else -> Bank (96%)
  
  IF NEW.method = 'cash' THEN 
    v_location := 'hand'; 
    v_amount := NEW.amount; 
  ELSE 
    v_location := 'bank'; 
    v_amount := NEW.amount * 0.96; 
  END IF;
  
  v_description := 'Ingreso: ' || NEW.method;

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO cash_journal (date, amount, type, description, location, user_id, reference_id, created_at)
    VALUES (NEW.created_at, v_amount, 'income', v_description, v_location::cash_location, (SELECT user_id FROM daily_incomes WHERE id = NEW.daily_income_id), NEW.id, NEW.created_at);
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE cash_journal 
    SET amount = v_amount, location = v_location::cash_location, description = v_description
    WHERE reference_id = NEW.id AND type = 'income';
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM cash_journal WHERE reference_id = OLD.id AND type = 'income';
    RETURN OLD;
  END IF;
  return NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RESET TRIGGER
DROP TRIGGER IF EXISTS tr_sync_income_journal ON public.income_payments;
CREATE TRIGGER tr_sync_income_journal 
AFTER INSERT OR UPDATE OR DELETE ON public.income_payments 
FOR EACH ROW EXECUTE PROCEDURE public.sync_income_journal_entry();

-- 3. FORCE UPDATE EXISTING DATA (CRITICAL FIX)
-- Previously we only updated amount. Now we MUST force location = 'bank' for non-cash methods.
UPDATE public.cash_journal cj
SET 
    amount = ip.amount * 0.96,
    location = 'bank'::cash_location
FROM public.income_payments ip
WHERE cj.reference_id = ip.id 
  AND cj.type = 'income'
  AND ip.method IN ('yape', 'transfer', 'card');
  -- Removed the margin of error check to FORCE update everything that matches

-- 4. CONFIRMATION
NOTIFY pgrst, 'reload schema';
