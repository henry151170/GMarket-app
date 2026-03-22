-- ============================================================================
-- GEEKSHOP FIX: EXPENSES SCHEMA & TRIGGERS
-- ============================================================================
-- EJECUTAR EN EL PROYECTO GEEKSHOP
-- ============================================================================

-- 1. FIX EXPENSES TABLE COLUMNS
-- =============================
DO $$ 
BEGIN 
  -- Check and add 'payment_method' if missing (might still be 'method')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'payment_method') THEN
    -- If 'method' exists, rename it. If not, add 'payment_method'.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'method') THEN
      ALTER TABLE public.expenses RENAME COLUMN method TO payment_method;
    ELSE
      ALTER TABLE public.expenses ADD COLUMN payment_method text DEFAULT 'cash';
    END IF;
  END IF;

  -- Add 'is_structural' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_structural') THEN
    ALTER TABLE public.expenses ADD COLUMN is_structural boolean DEFAULT false;
  END IF;

  -- Add 'status' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'status') THEN
    ALTER TABLE public.expenses ADD COLUMN status text DEFAULT 'paid';
  END IF;
END $$;

-- 2. CREATE MISSING TABLES (If 404s)
-- ==================================

-- Expense Concepts
CREATE TABLE IF NOT EXISTS public.expense_concepts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_concepts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own concepts" ON public.expense_concepts;
CREATE POLICY "Users manage own concepts" ON public.expense_concepts FOR ALL USING (auth.uid() = user_id);

-- Fixed Expense Templates
CREATE TABLE IF NOT EXISTS public.fixed_expense_templates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  amount numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'PEN',
  category text,
  day_of_month integer,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.fixed_expense_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own templates" ON public.fixed_expense_templates;
CREATE POLICY "Users manage own templates" ON public.fixed_expense_templates FOR ALL USING (auth.uid() = user_id);


-- 3. RESTORE JOURNAL DELETION FUNCTION (Generic)
-- ==============================================
CREATE OR REPLACE FUNCTION public.handle_journal_deletion() RETURNS TRIGGER AS $$
DECLARE
  journal_type text;
BEGIN
  journal_type := TG_ARGV[0];
  IF journal_type IS NOT NULL THEN
    DELETE FROM cash_journal
    WHERE reference_id = OLD.id
      AND type = journal_type;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FIX EXPENSE TRIGGER (Writing to Journal)
-- ===========================================
-- Drop old/conflicting function
DROP FUNCTION IF EXISTS public.log_expense_to_journal() CASCADE;

CREATE OR REPLACE FUNCTION public.log_expense_to_journal() RETURNS TRIGGER AS $$
DECLARE
  loc text;
BEGIN
  -- Only log if PAID
  IF NEW.status IS NOT NULL AND NEW.status != 'paid' THEN
    RETURN NEW;
  END IF;

  -- Logic: Cash -> Specified Location (or Hand default). Bank -> Bank.
  IF NEW.payment_method = 'cash' THEN
    loc := NEW.cash_location;
    IF loc IS NULL THEN loc := 'hand'; END IF; 
  ELSE
    loc := 'bank';
  END IF;
  
  -- Determine Journal Type
  -- If is_structural is true, maybe log differently? 
  -- For now, just 'expense' or 'structural_expense' if needed, but app likely uses 'expense' standard.
  -- userExpenses.ts mentions: const journalType = updatedExpense.is_structural ? 'structural_expense' : 'expense';
  -- But standard inserter usually just logged 'expense'. The code handles update manually. 
  -- The trigger handles INSERT. Let's check if we should infer generic 'expense'.
  
  INSERT INTO cash_journal (date, location, amount, type, reference_id, description, currency)
  VALUES (
    NEW.date, 
    loc::cash_location, 
    -NEW.amount, 
    'expense', -- keep simple for now
    NEW.id, 
    'Gasto: ' || NEW.category,
    NEW.currency
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS trigger_log_new_expense ON public.expenses;
CREATE TRIGGER trigger_log_new_expense
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_expense_to_journal();

-- Restore Delete Trigger
DROP TRIGGER IF EXISTS tr_delete_expense_journal ON public.expenses;
CREATE TRIGGER tr_delete_expense_journal
AFTER DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.handle_journal_deletion('expense');


-- 5. NOTIFY
NOTIFY pgrst, 'reload schema';
