-- ============================================================================
-- FIX: REMAINING MISSING COLUMNS
-- Problem: Error "column other_incomes.payment_method does not exist"
-- Cause: Tables created with older schema version.
-- ============================================================================

-- 1. FIX OTHER_INCOMES
-- ====================
alter table public.other_incomes 
add column if not exists payment_method text;

alter table public.other_incomes 
add column if not exists currency text default 'PEN';

-- 2. FIX PURCHASES (Proactive check)
-- ==================================
-- Ensure supplier_id exists (for new supplier feature)
alter table public.purchases 
add column if not exists supplier_id uuid references public.suppliers(id);

-- Ensure provider text exists (legacy support)
alter table public.purchases 
add column if not exists provider text;

-- 3. REFRESH SCHEMA CACHE
-- =======================
NOTIFY pgrst, 'reload schema';
