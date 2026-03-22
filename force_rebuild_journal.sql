-- ============================================================================
-- FORCE REBUILD: DELETE & RE-INSERT CASH JOURNAL INCOMES
-- ============================================================================

-- 1. DROP TRIGGERS TEMPORARILY (To prevent interference during rebuild)
DROP TRIGGER IF EXISTS tr_sync_income_journal ON public.income_payments;
DROP FUNCTION IF EXISTS public.sync_income_journal_entry();

-- 2. DELETE ALL EXISTING INCOME JOURNALS
-- We are wiping the slate clean for incomes to ensure no "ghost" incorrect records remain.
DELETE FROM public.cash_journal WHERE type = 'income';

-- 3. RE-INSERT EVERYTHING FROM INCOME_PAYMENTS
-- We assume income_payments is the SOURCE OF TRUTH.
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
    created_at,
    CASE 
        WHEN method = 'cash' THEN amount 
        ELSE amount * 0.96 -- Apply 4% commission (100% - 4% = 96%)
    END as amount,
    'income' as type,
    'Ingreso: ' || method as description,
    CASE 
        WHEN method = 'cash' THEN 'hand'::cash_location 
        ELSE 'bank'::cash_location 
    END as location,
    (SELECT user_id FROM daily_incomes WHERE id = daily_income_id) as user_id,
    id as reference_id,
    created_at
FROM public.income_payments;

-- 4. RESTORE TRIGGER WITH CORRECT LOGIC
CREATE OR REPLACE FUNCTION public.sync_income_journal_entry() RETURNS TRIGGER AS $$
DECLARE
  v_amount numeric;
  v_description text;
  v_location text;
BEGIN
  -- Logic
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

-- 5. CONFIRMATION
NOTIFY pgrst, 'reload schema';
