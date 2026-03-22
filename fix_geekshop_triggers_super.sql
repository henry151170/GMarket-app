-- ============================================================================
-- SUPER FIX: WIPE ALL OLD PURCHASE TRIGGERS AND INSTALL THE CORRECT ONE
-- Run this in Geekshop (and Safari/Gmarket if needed)
-- ============================================================================

-- 1. DYNAMICALLY DROP ALL EXISTING TRIGGERS ON PURCHASES
-- This ensures no rogue "amount" triggers are left behind.
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT DISTINCT trigger_name FROM information_schema.triggers WHERE event_object_table = 'purchases') 
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.purchases CASCADE', r.trigger_name);
  END LOOP;
END $$;

-- Drop old functions just in case
DROP FUNCTION IF EXISTS public.log_purchase_to_journal() CASCADE;
DROP FUNCTION IF EXISTS public.handle_purchase_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.handle_journal_deletion() CASCADE;

-- 2. CREATE ROBUST INSERT FUNCTION
CREATE OR REPLACE FUNCTION public.log_purchase_to_journal() RETURNS TRIGGER AS $$
DECLARE
  v_loc text;
  v_desc text;
BEGIN
  -- Handle DELETE just in case it's bound to delete
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

  -- INSERT WITH EXPLICIT CAST (uses NEW.total_amount, NOT NEW.amount!)
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
    v_loc::cash_location,  
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

-- 3. BIND THE CORRECT INSERT TRIGGER
CREATE TRIGGER tr_purchase_journal
AFTER INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.log_purchase_to_journal();

-- 4. FIX DELETE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_journal_deletion() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM cash_journal
  WHERE reference_id = OLD.id AND type = TG_ARGV[0];
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_delete_purchase_journal
AFTER DELETE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.handle_journal_deletion('purchase');

-- 5. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
