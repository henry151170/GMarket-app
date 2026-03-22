-- ============================================================================
-- FIX: SCHEMA COLUMNS CHECK
-- Problem: 400 Errors in Dashboard (Missing Columns)
-- Cause: Tables likely existed before migration script ran, skipping new columns.
-- ============================================================================

-- 1. FIX EXPENSES TABLE
-- =====================
alter table public.expenses 
add column if not exists is_structural boolean default false;

alter table public.expenses 
add column if not exists currency text default 'PEN';

-- Ensure category is text (not enum) to support custom templates
alter table public.expenses 
alter column category type text;

-- 2. FIX CASH JOURNAL TABLE
-- =========================
alter table public.cash_journal 
add column if not exists currency text default 'PEN';

alter table public.cash_journal 
add column if not exists created_at timestamptz default now();

-- 3. REFRESH SCHEMA CACHE
-- =======================
NOTIFY pgrst, 'reload schema';
