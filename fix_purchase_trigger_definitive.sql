-- ============================================================================
-- GMOBILE FIX: PURCHASE TRIGGER & CASTING
-- ============================================================================
-- EJECUTAR EN EL PROYECTO GMOBILE (y los demas por si acaso)
-- ============================================================================

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
  
  -- Description
  -- Note: Provider Name might be in a joined table or passed in? 
  -- The table has 'supplier_id', but likely no 'provider_name' column unless de-normalized.
  -- usePurchases.ts selects `suppliers (name)`. 
  -- We can try to fetch it, or just say 'Compra'.
  -- Let's check if 'notes' exists.
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

-- 5. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
