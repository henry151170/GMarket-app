-- ============================================================================
-- GEEKSHOP FIX: DEFINITIVE EXPENSE TRIGGER
-- ============================================================================
-- EJECUTAR EN EL PROYECTO GEEKSHOP
-- ============================================================================

-- 1. DROP EXISTING INTERFERING TRIGGERS/FUNCTIONS
DROP TRIGGER IF EXISTS trigger_log_new_expense ON public.expenses;
DROP FUNCTION IF EXISTS public.log_expense_to_journal();

-- 2. CREATE ROBUST JOURNAL FUNCTION
CREATE OR REPLACE FUNCTION public.log_expense_to_journal() RETURNS TRIGGER AS $$
DECLARE
  v_loc text;
  v_type text := 'expense';
  v_amount numeric;
BEGIN
  -- 2.1 CHECK STATUS
  -- If 'status' column exists and is 'pending', do not log.
  -- We assume column exists because of previous fix.
  -- Use COALESCE to handle nulls safely (treat as paid if null).
  IF COALESCE(NEW.status, 'paid') != 'paid' THEN
    RETURN NEW;
  END IF;

  -- 2.2 DETERMINE LOCATION
  -- Cash -> Specified Location (or Hand default). Bank/Transfer/Yape -> Bank.
  IF NEW.payment_method = 'cash' THEN
    v_loc := COALESCE(NEW.cash_location, 'hand'); 
    -- Safety check for invalid enum values (though casting handles it usually)
    IF v_loc NOT IN ('hand', 'bank') THEN v_loc := 'hand'; END IF;
  ELSE
    v_loc := 'bank';
  END IF;

  -- 2.3 AMOUNT (Force Negative)
  v_amount := -ABS(NEW.amount);

  -- 2.4 INSERT INTO JOURNAL
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
    v_amount, 
    v_type, 
    NEW.id, 
    'Gasto: ' || NEW.category,
    NEW.currency,
    NEW.user_id,
    now()
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback logging if something explodes, but don't block the INSERT of the expense
  RAISE WARNING 'Error in log_expense_to_journal: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. BIND TRIGGER
CREATE TRIGGER trigger_log_new_expense
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_expense_to_journal();

-- 4. FIX DELETE TRIGGER AS WELL (Handles deletions)
DROP TRIGGER IF EXISTS tr_delete_expense_journal ON public.expenses;
CREATE TRIGGER tr_delete_expense_journal
AFTER DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.handle_journal_deletion('expense');

-- 5. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
