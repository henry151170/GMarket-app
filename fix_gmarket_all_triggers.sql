-- ============================================================================
-- GMARKET FIX: BOTH PURCHASE AND OTHER INCOMES TRIGGERS & CASTING
-- ============================================================================

-- ==========================================
-- PART 1: PURCHASES TRIGGER FIX
-- ==========================================

-- 1. DROP OLD TRIGGERS
DROP TRIGGER IF EXISTS tr_purchase_journal ON public.purchases;
DROP FUNCTION IF EXISTS public.log_purchase_to_journal();

-- 2. CREATE ROBUST FUNCTION
CREATE OR REPLACE FUNCTION public.log_purchase_to_journal() RETURNS TRIGGER AS $$
DECLARE
  v_loc text;
  v_desc text;
BEGIN
  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM cash_journal WHERE reference_id = OLD.id AND type = 'purchase';
    RETURN OLD;
  END IF;

  -- Logic: Cash -> Hand. Others -> Bank.
  IF NEW.payment_method = 'cash' THEN
    v_loc := 'hand';
  ELSE
    v_loc := 'bank';
  END IF;
  
  v_desc := 'Compra: ' || COALESCE(NEW.notes, 'Sin detalles');

  -- INSERT WITH EXPLICIT CAST
  INSERT INTO cash_journal (
    date, 
    location, 
    amount, 
    type, 
    reference_id, 
    description, 
    user_id,
    created_at
  )
  VALUES (
    NEW.date, 
    v_loc::cash_location,  -- EXPLICIT CAST HERE
    -ABS(NEW.total_amount), 
    'purchase', 
    NEW.id, 
    v_desc,
    NEW.user_id,
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. BIND TRIGGER
CREATE TRIGGER tr_purchase_journal
AFTER INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.log_purchase_to_journal();

-- 4. FIX DELETE TRIGGER
-- Create generic deletion handler if not exists
CREATE OR REPLACE FUNCTION public.handle_journal_deletion() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM cash_journal
  WHERE reference_id = OLD.id AND type = TG_ARGV[0];
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_delete_purchase_journal ON public.purchases;
CREATE TRIGGER tr_delete_purchase_journal
AFTER DELETE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.handle_journal_deletion('purchase');

-- ==========================================
-- PART 2: OTHER INCOMES TRIGGER FIX
-- ==========================================

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

-- ==========================================
-- FINAL: REFRESH SCHEMA
-- ==========================================
NOTIFY pgrst, 'reload schema';
