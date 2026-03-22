-- ============================================================================
-- GMOBILE FIX: OTHER INCOMES TRIGGER & CASTING
-- ============================================================================

-- 1. ADD COLUMNS IF MISSING
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'other_incomes' AND column_name = 'payment_method') THEN
    ALTER TABLE public.other_incomes ADD COLUMN payment_method text DEFAULT 'cash';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'other_incomes' AND column_name = 'currency') THEN
    ALTER TABLE public.other_incomes ADD COLUMN currency text DEFAULT 'PEN';
  END IF;
END $$;

-- 2. CREATE FUNCTION
CREATE OR REPLACE FUNCTION public.log_other_income_to_journal() RETURNS TRIGGER AS $$
DECLARE
  v_loc text;
  v_details text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM cash_journal WHERE reference_id = OLD.id AND type = 'other_income';
    RETURN OLD;
  END IF;

  IF NEW.payment_method = 'cash' THEN
    v_loc := 'hand';
  ELSE
    v_loc := 'bank';
  END IF;
  
  v_details := COALESCE(NEW.description, 'Otros Ingresos');

  IF (TG_OP = 'UPDATE') THEN
      UPDATE cash_journal
      SET 
        date = NEW.date,
        location = v_loc::cash_location, 
        amount = NEW.amount, 
        description = 'Otro Ingreso: ' || v_details,
        currency = NEW.currency
      WHERE reference_id = NEW.id AND type = 'other_income';
      RETURN NEW;
  END IF;

  INSERT INTO cash_journal (
    date, 
    location, 
    amount, 
    type, 
    reference_id, 
    description, 
    currency,
    user_id,
    created_at
  )
  VALUES (
    NEW.date, 
    v_loc::cash_location, 
    NEW.amount, 
    'other_income', 
    NEW.id, 
    'Otro Ingreso: ' || v_details,
    COALESCE(NEW.currency, 'PEN'),
    NEW.user_id,
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. BIND TRIGGER
DROP TRIGGER IF EXISTS tr_other_income_journal ON public.other_incomes;
DROP TRIGGER IF EXISTS tr_log_other_income ON public.other_incomes;

CREATE TRIGGER tr_other_income_journal
AFTER INSERT OR UPDATE OR DELETE ON public.other_incomes
FOR EACH ROW EXECUTE FUNCTION public.log_other_income_to_journal();

-- 4. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
