-- ============================================================================
-- FIX V2: MISSING COLUMNS IN CASH_JOURNAL
-- Problem: Error "column user_id of relation cash_journal does not exist"
-- Cause: Table existed from potential previous attempts with older schema.
-- ============================================================================

-- 1. FIX CASH JOURNAL
-- ===================
alter table public.cash_journal 
add column if not exists user_id uuid references public.profiles(id);

alter table public.cash_journal 
add column if not exists origin_id uuid;

-- 2. REFRESH SCHEMA CACHE
-- =======================
NOTIFY pgrst, 'reload schema';
