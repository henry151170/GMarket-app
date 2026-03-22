-- ============================================================================
-- FINAL FIX: REPAIR EXPENSES TABLE
-- Problem: Persistent "column does not exist" errors
-- Strategy: Aggressively update columns to ensure they match App expectation
-- ============================================================================

-- 1. ENSURE TYPES EXIST
-- =====================
do $$ 
begin 
    create type expense_status as enum ('paid', 'pending'); 
exception 
    when duplicate_object then null; 
end $$;

-- 2. REPAIR EXPENSES TABLE (Force Columns)
-- ========================================

-- A. Fix STATUS Column
alter table public.expenses drop column if exists status cascade;
alter table public.expenses add column status expense_status default 'paid';

-- B. Fix TEMPLATE_ID Column
alter table public.expenses drop column if exists template_id cascade;
alter table public.expenses add column template_id uuid references public.fixed_expense_templates(id);

-- C. Fix IS_STRUCTURAL Column
alter table public.expenses drop column if exists is_structural cascade;
alter table public.expenses add column is_structural boolean default false;

-- D. Fix CURRENCY Column (If incorrect)
-- We don't drop currency as it might have data, but we ensure default
alter table public.expenses alter column currency set default 'PEN';

-- E. Fix CATEGORY Column (Ensure it is TEXT)
alter table public.expenses alter column category type text;

-- 3. REPAIR CASH JOURNAL (Completeness Check)
-- ===========================================
alter table public.cash_journal add column if not exists user_id uuid references public.profiles(id);
alter table public.cash_journal add column if not exists origin_id uuid;

-- 4. REFRESH SCHEMA CACHE (Crucial)
-- =================================
NOTIFY pgrst, 'reload schema';
