-- ============================================================================
-- GEEKSHOP FIX: FORCE EXPENSE COLUMNS & SCHEMA RELOAD
-- ============================================================================
-- EJECUTAR EN EL PROYECTO GEEKSHOP
-- ============================================================================

-- 1. FORCE ADD COLUMNS (If they somehow failed before)
DO $$ 
BEGIN 
  -- payment_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'payment_method') THEN
    ALTER TABLE public.expenses ADD COLUMN payment_method text DEFAULT 'cash';
  END IF;

  -- is_structural
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_structural') THEN
    ALTER TABLE public.expenses ADD COLUMN is_structural boolean DEFAULT false;
  END IF;

  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'status') THEN
    ALTER TABLE public.expenses ADD COLUMN status text DEFAULT 'paid';
  END IF;
  
  -- cash_location
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'cash_location') THEN
    ALTER TABLE public.expenses ADD COLUMN cash_location cash_location;
  END IF;
END $$;

-- 2. GRANT PERMISSIONS (Just in case)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO service_role;

-- 3. ENSURE TRIGGER HANDLES UPDATES TOO
-- The frontend tries to do it manually, but a DB trigger is safer for "counting" logic.
-- However, creating a duplicate journal entry is bad.
-- Let's stick to the frontend logic for now, BUT we need to make sure the TRIGGER doesn't fight it.
-- My previous trigger `trigger_log_new_expense` was INSERT ONLY. That's good.

-- 4. REFRESH SCHEMA CACHE (The 406 Fix)
NOTIFY pgrst, 'reload schema';

-- 5. VERIFY
-- Run this manually in SQL editor to see if columns are there:
-- SELECT * FROM expenses LIMIT 1;
