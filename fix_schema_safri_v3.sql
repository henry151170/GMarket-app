-- ============================================================================
-- FIX V3: MISSING COLUMNS IN EXPENSES (STATUS & TEMPLATE)
-- Problem: Error "column expenses.status does not exist"
-- Cause: Table existed from potential previous attempts with older schema.
-- ============================================================================

-- 1. ENSURE ENUM EXISTS
-- =====================
do $$ 
begin 
  create type expense_status as enum ('paid', 'pending'); 
exception 
  when duplicate_object then null; 
end $$;

-- 2. FIX EXPENSES TABLE
-- =====================
-- Add status column
alter table public.expenses 
add column if not exists status expense_status default 'paid';

-- Add template_id column (Just in case it matches the same missing pattern)
alter table public.expenses 
add column if not exists template_id uuid references public.fixed_expense_templates(id);

-- 3. REFRESH SCHEMA CACHE
-- =======================
NOTIFY pgrst, 'reload schema';
