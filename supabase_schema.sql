-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ROLES ENUM
create type user_role as enum ('admin', 'worker');

-- PROFILES (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role user_role default 'worker',
  created_at timestamptz default now()
);

-- INCOME TOTALS (Daily Log)
create table daily_incomes (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  total_facturas numeric(10,2) default 0,
  total_boletas numeric(10,2) default 0,
  total_notas_venta numeric(10,2) default 0,
  total_calculated numeric(10,2) generated always as (total_facturas + total_boletas + total_notas_venta) stored,
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  unique(date, user_id) -- One record per user per day
);

-- PAYMENT METHODS ENUM
create type payment_method as enum ('cash', 'yape', 'card', 'transfer');
-- CASH LOCATION ENUM
create type cash_location as enum ('hand', 'bank');

-- INCOME PAYMENTS (Breakdown)
create table income_payments (
  id uuid default uuid_generate_v4() primary key,
  daily_income_id uuid references daily_incomes(id) on delete cascade not null,
  method payment_method not null,
  amount numeric(10,2) not null check (amount >= 0),
  cash_location cash_location, -- Only if method is cash
  created_at timestamptz default now()
);

-- EXPENSE CATEGORIES
create type expense_category as enum (
  'packaging', -- Bolsas y empaques
  'cleaning', -- Limpieza
  'transport', -- Transporte
  'advertising', -- Publicidad
  'maintenance', -- Mantenimiento
  'food', -- Alimentación
  'wages', -- Planilla/Salarios (Fixed)
  'utilities', -- Luz/Agua/Internet (Fixed)
  'rent', -- Alquiler (Fixed)
  'other'
);

-- EXPENSES (Operational & Fixed)
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  category expense_category not null,
  description text,
  amount numeric(10,2) not null check (amount > 0),
  date date not null default current_date,
  payment_method payment_method not null,
  cash_location cash_location, -- Where did the money come from?
  user_id uuid references profiles(id) not null,
  is_fixed boolean default false, -- True for Rent, Wages, etc.
  created_at timestamptz default now()
);

-- FUND TRANSFERS (Mano <-> Banco)
create table fund_transfers (
  id uuid default uuid_generate_v4() primary key,
  amount numeric(10,2) not null check (amount > 0),
  date date not null default current_date,
  origin cash_location not null,
  destination cash_location not null,
  description text,
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  check (origin != destination)
);

-- CASH JOURNAL (For calculating balances: Hand vs Bank)
-- This table is populated via triggers from incomes, expenses, and transfers
create table cash_journal (
  id uuid default uuid_generate_v4() primary key,
  date timestamptz default now(),
  location cash_location not null,
  amount numeric(10,2) not null, -- Positive = Credit (In), Negative = Debit (Out)
  type text not null, -- 'income', 'expense', 'transfer_in', 'transfer_out'
  reference_id uuid, -- Link to source table
  description text
);

-- RLS POLICIES
alter table profiles enable row level security;
alter table daily_incomes enable row level security;
alter table income_payments enable row level security;
alter table expenses enable row level security;
alter table fund_transfers enable row level security;
alter table cash_journal enable row level security;

-- DATA ACCESS POLICIES

-- Profiles: 
-- Everyone can read their own. Admin can read all.
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Daily Incomes:
-- Worker can see own. Admin can see all.
create policy "Workers view own incomes" on daily_incomes for select using (user_id = auth.uid());
create policy "Admins view all incomes" on daily_incomes for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- Worker can insert own.
create policy "Workers insert own incomes" on daily_incomes for insert with check (user_id = auth.uid());

-- Income Payments:
-- Same as incomes
create policy "Workers view own payments" on income_payments for select using (
  exists (select 1 from daily_incomes where id = income_payments.daily_income_id and user_id = auth.uid())
);
create policy "Admins view all payments" on income_payments for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Workers insert own payments" on income_payments for insert with check (
  exists (select 1 from daily_incomes where id = daily_income_id and user_id = auth.uid())
);

-- Expenses:
-- Worker can view/insert own. Admin view all.
create policy "Workers view own expenses" on expenses for select using (user_id = auth.uid());
create policy "Admins view all expenses" on expenses for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Workers can insert expenses" on expenses for insert with check (user_id = auth.uid());

-- Transfers:
-- Only Admin can manage transfers usually, or maybe trusted workers. 
-- For now, let's say only Admin for transfers as per prompt implications? 
-- "7. 💵 Transferencias - Efectivo mano ↔ banco" is listed under Admin Modules.
create policy "Admins manage transfers" on fund_transfers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- FUNCTIONS & TRIGGERS

-- 1. Helper to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'worker');
  return new;
end;
CREATE POLICY "Admins can delete daily_incomes" ON daily_incomes
  FOR DELETE USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

CREATE POLICY "Admins can update income_payments" ON income_payments
  FOR UPDATE USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

CREATE POLICY "Admins can delete income_payments" ON income_payments
  FOR DELETE USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

CREATE POLICY "Admins can update cash_journal" ON cash_journal
  FOR UPDATE USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

CREATE POLICY "Admins can delete cash_journal" ON cash_journal
  FOR DELETE USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- TABLE: other_incomes
CREATE TABLE IF NOT EXISTS other_incomes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE other_incomes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own other incomes" ON other_incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own other incomes" ON other_incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own other incomes" ON other_incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own other incomes" ON other_incomes FOR DELETE USING (auth.uid() = user_id);
