-- ============================================================================
-- FIX WORKER PURCHASE DELETION (RLS POLICIES)
-- Run this script in the SQL Editor of Safri (and any other affected app)
-- to allow workers to delete their own purchases.
-- ============================================================================

-- 1. Ensure the purchases table allows full CRUD for the owner (including DELETE)
drop policy if exists "Users manage own purchases" on public.purchases;
drop policy if exists "Users delete own purchases" on public.purchases;

create policy "Users manage own purchases" on public.purchases 
for all using (auth.uid() = user_id);

-- Also ensure admins can manage all purchases (Admin CRUD)
drop policy if exists "Admins view all purchases" on public.purchases;
drop policy if exists "Admins manage all purchases" on public.purchases;
create policy "Admins manage all purchases" on public.purchases 
for all using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- 2. Ensure purchase_items allows full CRUD so ON DELETE CASCADE doesn't fail
drop policy if exists "Users manage own items" on public.purchase_items;
drop policy if exists "Users delete own items" on public.purchase_items;

create policy "Users manage own items" on public.purchase_items 
for all using (true);

-- 3. Ensure cash_journal allows full CRUD so the trigger doesn't fail 
-- (Although the trigger is SECURITY DEFINER, we enforce it just to be safe)
drop policy if exists "Allow All Authenticated Journal" on public.cash_journal;

create policy "Allow All Authenticated Journal" on public.cash_journal 
for all using (auth.role() = 'authenticated');

-- Reload schema cache to apply immediately
NOTIFY pgrst, 'reload schema';
