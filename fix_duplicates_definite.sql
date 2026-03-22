-- ============================================================================
-- DEFINITIVE FIX: REMOVE DUPLICATE TRIGGERS & DATA
-- ============================================================================

-- 1. DROP ALL POTENTIAL CONFLICTING TRIGGERS
-- We suspect there are TWO triggers firing: one old, one new.
DROP TRIGGER IF EXISTS tr_log_income_to_journal ON public.income_payments;
DROP FUNCTION IF EXISTS public.log_income_to_journal();

DROP TRIGGER IF EXISTS tr_sync_income_journal ON public.income_payments;
DROP FUNCTION IF EXISTS public.sync_income_journal_entry();

-- 2. CREATE THE SINGLE CORRECT FUNCTION (v4 Logic)
CREATE OR REPLACE FUNCTION public.sync_income_journal_entry() RETURNS TRIGGER AS $$
DECLARE
  v_amount numeric;
  v_description text;
  v_location text;
  v_profile_exists boolean;
BEGIN
  -- LOGIC: 
  -- Cash -> Hand (100%)
  -- Yape/Card/Transfer -> Bank (96%)
  
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
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE THE SINGLE TRIGGER
CREATE TRIGGER tr_sync_income_journal 
AFTER INSERT OR UPDATE OR DELETE ON public.income_payments 
FOR EACH ROW EXECUTE PROCEDURE public.sync_income_journal_entry();

-- 4. CLEANUP DUPLICATES (Delete & Rebuild Incomes)
DELETE FROM public.cash_journal WHERE type = 'income';

INSERT INTO public.cash_journal (
    date, 
    amount, 
    type, 
    description, 
    location, 
    user_id, 
    reference_id, 
    created_at
)
SELECT 
    ip.created_at,
    CASE 
        WHEN ip.method = 'cash' THEN ip.amount 
        ELSE ip.amount * 0.96 
    END,
    'income',
    'Ingreso: ' || ip.method,
    CASE 
        WHEN ip.method = 'cash' THEN 'hand'::cash_location 
        ELSE 'bank'::cash_location 
    END,
    di.user_id,
    ip.id,
    ip.created_at
FROM public.income_payments ip
JOIN public.daily_incomes di ON ip.daily_income_id = di.id;

-- 5. CONFIRMATION
NOTIFY pgrst, 'reload schema';
