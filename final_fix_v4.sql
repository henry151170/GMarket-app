-- ============================================================================
-- FINAL FIX V4: SCHEMA ERRORS & COMMISSION LOGIC (ALL IN ONE)
-- ============================================================================

-- 1. FIX MISSING COLUMNS (daily_incomes)
-- ======================================
DO $$ 
BEGIN 
  -- Add 'responsible_person' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_incomes' AND column_name = 'responsible_person') THEN
    ALTER TABLE public.daily_incomes ADD COLUMN responsible_person text DEFAULT 'Sin asignar';
  END IF;

  -- Add 'total_cost' if missing (User reported error 400 for this too)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_incomes' AND column_name = 'total_cost') THEN
    ALTER TABLE public.daily_incomes ADD COLUMN total_cost numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- 2. RE-ESTABLISH 4% COMMISSION TRIGGER
-- =====================================
DROP TRIGGER IF EXISTS tr_sync_income_journal ON public.income_payments;
DROP FUNCTION IF EXISTS public.sync_income_journal_entry();

CREATE OR REPLACE FUNCTION public.sync_income_journal_entry() RETURNS TRIGGER AS $$
DECLARE
  v_amount numeric;
  v_description text;
  v_location text;
  v_profile_exists boolean;
BEGIN
  -- Validate Daily Income Relation
  -- (Optional: add checks here if needed)
  
  -- LOGIC: 
  -- Cash -> Hand (100%)
  -- Yape/Card/Transfer -> Bank (96%) => 4% Commission
  
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

CREATE TRIGGER tr_sync_income_journal 
AFTER INSERT OR UPDATE OR DELETE ON public.income_payments 
FOR EACH ROW EXECUTE PROCEDURE public.sync_income_journal_entry();

-- 3. FORCE REBUILD OF CASH JOURNAL (INCOMES ONLY)
-- ===============================================
-- Use a temporary table to avoid constraint issues during bulk delete/insert if necessary, 
-- but direct DELETE/INSERT is usually fine for this volume.

-- A. Delete all existing Income entries to clear "bad" data (100% in bank, or wrong location)
DELETE FROM public.cash_journal WHERE type = 'income';

-- B. Re-insert from Source of Truth (income_payments) with Correct Logic
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
        ELSE ip.amount * 0.96 -- FORCE 96%
    END,
    'income',
    'Ingreso: ' || ip.method,
    CASE 
        WHEN ip.method = 'cash' THEN 'hand'::cash_location 
        ELSE 'bank'::cash_location -- FORCE BANK
    END,
    di.user_id,
    ip.id,
    ip.created_at
FROM public.income_payments ip
JOIN public.daily_incomes di ON ip.daily_income_id = di.id;

-- 4. CONFIRMATION
NOTIFY pgrst, 'reload schema';
