-- ============================================================================
-- FIX: ADD MISSING COLUMN 'responsible_person' TO 'daily_incomes'
-- ============================================================================

-- 1. ADD COLUMN IF NOT EXISTS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_incomes' AND column_name = 'responsible_person') THEN
    ALTER TABLE public.daily_incomes 
    ADD COLUMN responsible_person text DEFAULT 'Sin asignar';
  END IF;
END $$;

-- 2. UPDATE EXISTING RECORDS
-- Set a default value for existing records if needed (though DEFAULT handles new ones)
UPDATE public.daily_incomes 
SET responsible_person = 'Sin asignar' 
WHERE responsible_person IS NULL;

-- 3. CONFIRMATION
NOTIFY pgrst, 'reload schema';
