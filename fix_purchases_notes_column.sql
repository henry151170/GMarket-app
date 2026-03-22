-- ============================================================================
-- FIX MISSING NOTES COLUMN
-- Adds the 'notes' column to the 'purchases' table if it doesn't exist.
-- Run this in the SQL Editor of Geekshop, Safri, GMarket, etc.
-- ============================================================================

do $$ 
begin 
  -- Add 'notes' to purchases
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'purchases' and column_name = 'notes') then
    alter table public.purchases add column notes text;
  end if;
end $$;

-- Reload schema cache to apply immediately
NOTIFY pgrst, 'reload schema';
