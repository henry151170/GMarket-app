-- ============================================================================
-- FIX ADMIN PERMISSIONS (RLS POLICIES)
-- Run this script in the SQL Editor of Safri, Geekshop, GMarket, GMobile
-- to allow Administrators to edit and delete ANY record in the system.
-- ============================================================================

-- Helper variable for the role check condition
-- using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))

-- 1. PURCHASES
drop policy if exists "Admins view all purchases" on public.purchases;
drop policy if exists "Admins manage all purchases" on public.purchases;
create policy "Admins manage all purchases" on public.purchases 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 2. EXPENSES
drop policy if exists "Admins view all expenses" on public.expenses;
drop policy if exists "Admins manage all expenses" on public.expenses;
create policy "Admins manage all expenses" on public.expenses 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 3. DAILY INCOMES
drop policy if exists "Admins view all incomes" on public.daily_incomes;
drop policy if exists "Admins manage all incomes" on public.daily_incomes;
create policy "Admins manage all incomes" on public.daily_incomes 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 4. OTHER INCOMES
drop policy if exists "Admins manage all other incomes" on public.other_incomes;
create policy "Admins manage all other incomes" on public.other_incomes 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 5. INCOME PAYMENTS
-- Ya suele ser public (true) pero por si acaso
drop policy if exists "Admins manage all payments" on public.income_payments;
create policy "Admins manage all payments" on public.income_payments 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 6. CASH JOURNAL
-- Ya suele tener "for all using (auth.role() = 'authenticated')", pero para estar seguros:
drop policy if exists "Admins manage all journal" on public.cash_journal;
create policy "Admins manage all journal" on public.cash_journal 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 7. TEMPLATES & CATEGORIES
drop policy if exists "Admins view all templates" on public.fixed_expense_templates;
drop policy if exists "Admins manage all templates" on public.fixed_expense_templates;
create policy "Admins manage all templates" on public.fixed_expense_templates 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins view all categories" on public.expense_categories;
drop policy if exists "Admins manage all categories" on public.expense_categories;
create policy "Admins manage all categories" on public.expense_categories 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins view all concepts" on public.expense_concepts;
drop policy if exists "Admins manage all concepts" on public.expense_concepts;
create policy "Admins manage all concepts" on public.expense_concepts 
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
