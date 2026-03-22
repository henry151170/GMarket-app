-- ============================================================================
-- FIX MISSING COLUMNS IN PURCHASES
-- Run this in the SQL Editor of your projects (Geekshop, Safri, GMarket)
-- ============================================================================

do $$ 
begin 
  -- 1. Add 'notes' to purchases
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'purchases' and column_name = 'notes') then
    alter table public.purchases add column notes text;
  end if;

  -- 2. Add 'status' to purchases (defaults to 'completed' so past records work)
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'purchases' and column_name = 'status') then
    alter table public.purchases add column status text default 'completed';
  end if;
end $$;

-- Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
