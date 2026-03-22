-- ============================================================================
-- GEEKSHOP RLS POLICY FIX
-- Replaces restrictive Select/Insert/Delete policies with full CRUD (ALL) policies.
-- Fixes "406 Not Acceptable / 0 rows returned" on UPDATE statements.
-- ============================================================================

-- ==========================================
-- 1. EXPENSES
-- ==========================================
-- Drop restrictive policies if they exist
drop policy if exists "Users view own expenses" on public.expenses;
drop policy if exists "Users insert own expenses" on public.expenses;
drop policy if exists "Users delete own expenses" on public.expenses;
drop policy if exists "Users manage own expenses" on public.expenses;
-- Create the new exhaustive policy
create policy "Users manage own expenses" on public.expenses 
for all using (auth.uid() = user_id);

-- ==========================================
-- 2. PURCHASES
-- ==========================================
-- Drop restrictive policies if they exist
drop policy if exists "Users view own purchases" on public.purchases;
drop policy if exists "Users insert own purchases" on public.purchases;
drop policy if exists "Users delete own purchases" on public.purchases;
drop policy if exists "Users manage own purchases" on public.purchases;
-- Create the new exhaustive policy
create policy "Users manage own purchases" on public.purchases 
for all using (auth.uid() = user_id);

-- ==========================================
-- 3. OTHER INCOMES
-- ==========================================
-- Drop restrictive policies if they exist
drop policy if exists "Users view own other incomes" on public.other_incomes;
drop policy if exists "Users insert own other incomes" on public.other_incomes;
drop policy if exists "Users delete own other incomes" on public.other_incomes;
drop policy if exists "Users manage own other incomes" on public.other_incomes;
-- Create the new exhaustive policy
create policy "Users manage own other incomes" on public.other_incomes 
for all using (auth.uid() = user_id);

-- ==========================================
-- 4. DAILY INCOMES
-- ==========================================
-- Drop restrictive policies if they exist
drop policy if exists "Users view own incomes" on public.daily_incomes;
drop policy if exists "Users insert own incomes" on public.daily_incomes;
drop policy if exists "Users manage own incomes" on public.daily_incomes;
-- Create the new exhaustive policy
create policy "Users manage own incomes" on public.daily_incomes 
for all using (auth.uid() = user_id);

-- ==========================================
-- 5. INCOME PAYMENTS
-- ==========================================
-- Drop restrictive policies if they exist
drop policy if exists "Users view own payments" on public.income_payments;
drop policy if exists "Users insert own payments" on public.income_payments;
drop policy if exists "Users manage own payments" on public.income_payments;
-- Create the new exhaustive policy
create policy "Users manage own payments" on public.income_payments 
for all using (true);

-- Ensure everything applies immediately
NOTIFY pgrst, 'reload schema';
