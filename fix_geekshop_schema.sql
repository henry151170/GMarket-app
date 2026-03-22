-- ============================================================================
-- GEEKSHOP SCHEMA FIX
-- Adds missing tables and columns required for Expenses and Purchases features
-- ============================================================================

-- 1. Create missing tables if they don't exist
create table if not exists public.expense_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  is_fixed boolean default false,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table if not exists public.expense_concepts (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table if not exists public.fixed_expense_templates (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  amount numeric(10,2) not null,
  currency text default 'PEN',
  category text not null,
  day_of_month integer not null check (day_of_month between 1 and 31),
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table if not exists public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 2. Add missing columns to purchases and expenses
do $$ 
begin 
  -- Add supplier_id to purchases
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'purchases' and column_name = 'supplier_id') then
    alter table public.purchases add column supplier_id uuid references public.suppliers(id);
  end if;

  -- Add is_structural to expenses
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'is_structural') then
    alter table public.expenses add column is_structural boolean default false;
  end if;
  
  -- Add template_id to expenses
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'template_id') then
    alter table public.expenses add column template_id uuid references public.fixed_expense_templates(id);
  end if;
end $$;

-- 3. Create purchase_items table (needs purchases table to exist)
create table if not exists public.purchase_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_id uuid references public.purchases(id) on delete cascade not null,
  product_name text not null,
  quantity numeric(10,2) not null default 0,
  unit_price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- 4. Enable RLS and setup permissive policies for missing tables
alter table public.expense_categories enable row level security;
alter table public.expense_concepts enable row level security;
alter table public.fixed_expense_templates enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_items enable row level security;

-- Drop and recreate policies to avoid duplicate name errors
drop policy if exists "Users manage own templates" on public.fixed_expense_templates;
create policy "Users manage own templates" on public.fixed_expense_templates for all using (auth.uid() = user_id);

drop policy if exists "Admins view all templates" on public.fixed_expense_templates;
create policy "Admins view all templates" on public.fixed_expense_templates for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Users manage own categories" on public.expense_categories;
create policy "Users manage own categories" on public.expense_categories for all using (user_id = auth.uid());

drop policy if exists "Admins view all categories" on public.expense_categories;
create policy "Admins view all categories" on public.expense_categories for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Users manage own concepts" on public.expense_concepts;
create policy "Users manage own concepts" on public.expense_concepts for all using (user_id = auth.uid());

drop policy if exists "Admins view all concepts" on public.expense_concepts;
create policy "Admins view all concepts" on public.expense_concepts for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Users manage own suppliers" on public.suppliers;
create policy "Users manage own suppliers" on public.suppliers for all using (true);

drop policy if exists "Users manage own items" on public.purchase_items;
create policy "Users manage own items" on public.purchase_items for all using (true);

-- 5. Notify PostgREST to reload schema cache so the API immediately picks up new columns
NOTIFY pgrst, 'reload schema';
