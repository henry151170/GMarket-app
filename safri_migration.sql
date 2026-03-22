-- ============================================================================
-- SAFRI MIGRATION SCRIPT (CONSOLIDATED & IDEMPOTENT)
-- Includes: Master Schema + All Recent Fixes
-- Safe to run multiple times (drops policies before creating)
-- ============================================================================

-- 1. EXTENSIONS & FUNCTIONS
-- =========================
create extension if not exists "uuid-ossp";

-- Helper: Check if user is admin (Secure RLS)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. ENUMS
-- ========
do $$ begin create type user_role as enum ('admin', 'worker'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('cash', 'yape', 'card', 'transfer'); exception when duplicate_object then null; end $$;
do $$ begin create type cash_location as enum ('hand', 'bank'); exception when duplicate_object then null; end $$;
do $$ begin create type expense_status as enum ('paid', 'pending'); exception when duplicate_object then null; end $$;

-- 3. TABLES
-- =========

-- PROFILES
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role user_role default 'worker',
  created_at timestamptz default now()
);

-- EXPENSE CATEGORIES
create table if not exists public.expense_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  is_fixed boolean default false,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

-- EXPENSE CONCEPTS
create table if not exists public.expense_concepts (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

-- FIXED EXPENSE TEMPLATES
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

-- SUPPLIERS
create table if not exists public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- DAILY INCOMES
create table if not exists daily_incomes (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  total_facturas numeric(10,2) default 0,
  total_boletas numeric(10,2) default 0,
  total_notas_venta numeric(10,2) default 0,
  total_calculated numeric(10,2) default 0, 
  user_id uuid references profiles(id) not null,
  total_cost numeric(10,2) default 0,
  difference_amount numeric(10,2) default 0,
  difference_reason text,
  difference_note text,
  observation text,
  item_count integer default 0,
  responsible_person text,
  tolerance_amount numeric(10,2) default 0,
  created_at timestamptz default now(),
  unique(date, user_id)
);

-- INCOME PAYMENTS
create table if not exists income_payments (
  id uuid default uuid_generate_v4() primary key,
  daily_income_id uuid references daily_incomes(id) on delete cascade not null,
  method payment_method not null,
  amount numeric(10,2) not null check (amount >= 0),
  cash_location cash_location,
  created_at timestamptz default now()
);

-- EXPENSES
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  category text not null,
  description text,
  amount numeric(10,2) not null check (amount > 0),
  date date not null default current_date,
  payment_method text not null,
  cash_location text,
  user_id uuid references profiles(id) not null,
  is_fixed boolean default false,
  is_structural boolean default false,
  currency text default 'PEN',
  status expense_status default 'paid',
  template_id uuid references fixed_expense_templates(id),
  created_at timestamptz default now()
);

-- PURCHASES
create table if not exists purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  date date not null default current_date,
  total_amount numeric(10,2) not null default 0,
  payment_method text not null,
  status text default 'completed',
  notes text,
  provider text, 
  supplier_id uuid references suppliers(id),
  description text,
  created_at timestamptz default now()
);

-- PURCHASE ITEMS
create table if not exists public.purchase_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_id uuid references public.purchases(id) on delete cascade not null,
  product_name text not null,
  quantity numeric(10,2) not null default 0,
  unit_price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- CASH JOURNAL
create table if not exists cash_journal (
  id uuid default uuid_generate_v4() primary key,
  date timestamptz default now(),
  location text not null,
  amount numeric(10,2) not null,
  type text not null,
  reference_id uuid,
  description text,
  user_id uuid references profiles(id),
  currency text default 'PEN',
  created_at timestamptz default now(),
  origin_id uuid
);

-- OTHER INCOMES
create table if not exists other_incomes (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  amount numeric(10,2) not null check (amount >= 0),
  description text,
  category text,
  user_id uuid references profiles(id) not null,
  payment_method text,
  currency text default 'PEN',
  created_at timestamptz default now()
);

-- 4. RLS POLICIES (With Drop if Exists - Syntax Fixed)
-- =====================================
alter table profiles enable row level security;
alter table daily_incomes enable row level security;
alter table expenses enable row level security;
alter table purchases enable row level security;
alter table income_payments enable row level security;
alter table cash_journal enable row level security;
alter table other_incomes enable row level security;
alter table expense_categories enable row level security;
alter table expense_concepts enable row level security;
alter table fixed_expense_templates enable row level security;
alter table suppliers enable row level security;
alter table purchase_items enable row level security;

-- Profiles
drop policy if exists "Users view own profile" on profiles;
create policy "Users view own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "Admins view all profiles" on profiles;
create policy "Admins view all profiles" on profiles for select using (public.is_admin());

-- Cash Journal
drop policy if exists "Allow All Authenticated Journal" on cash_journal;
create policy "Allow All Authenticated Journal" on cash_journal for all using (auth.role() = 'authenticated');

-- Expenses
drop policy if exists "Users manage own expenses" on expenses;
create policy "Users manage own expenses" on expenses for all using (auth.uid() = user_id);
drop policy if exists "Admins view all expenses" on expenses;
create policy "Admins view all expenses" on expenses for select using (public.is_admin());

-- Purchases
drop policy if exists "Users manage own purchases" on purchases;
create policy "Users manage own purchases" on purchases for all using (auth.uid() = user_id);
drop policy if exists "Admins view all purchases" on purchases;
create policy "Admins view all purchases" on purchases for select using (public.is_admin());

drop policy if exists "Users manage own suppliers" on suppliers;
create policy "Users manage own suppliers" on suppliers for all using (true);
drop policy if exists "Users manage own items" on purchase_items;
create policy "Users manage own items" on purchase_items for all using (true);

-- Templates & Lists
drop policy if exists "Users manage own templates" on fixed_expense_templates;
create policy "Users manage own templates" on fixed_expense_templates for all using (auth.uid() = user_id);
drop policy if exists "Admins view all templates" on fixed_expense_templates;
create policy "Admins view all templates" on fixed_expense_templates for select using (public.is_admin());

drop policy if exists "Users manage own categories" on expense_categories;
create policy "Users manage own categories" on expense_categories for all using (user_id = auth.uid());
drop policy if exists "Admins view all categories" on expense_categories;
create policy "Admins view all categories" on expense_categories for select using (public.is_admin());

drop policy if exists "Users manage own concepts" on expense_concepts;
create policy "Users manage own concepts" on expense_concepts for all using (user_id = auth.uid());
drop policy if exists "Admins view all concepts" on expense_concepts;
create policy "Admins view all concepts" on expense_concepts for select using (public.is_admin());

-- Daily Incomes
drop policy if exists "Users manage own incomes" on daily_incomes;
create policy "Users manage own incomes" on daily_incomes for all using (auth.uid() = user_id);
drop policy if exists "Admins view all incomes" on daily_incomes;
create policy "Admins view all incomes" on daily_incomes for select using (public.is_admin());
drop policy if exists "Users manage own payments" on income_payments;
create policy "Users manage own payments" on income_payments for all using (true);

-- Other Incomes
drop policy if exists "Users manage own other incomes" on other_incomes;
create policy "Users manage own other incomes" on other_incomes for all using (auth.uid() = user_id);


-- 5. TRIGGERS & LOGIC
-- ===================

-- New User
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'worker');
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Expense -> Journal (PAID ONLY)
create or replace function sync_expense_to_journal() returns trigger as $$
declare
  val_location text;
  val_type text;
begin
  -- INSERT
  IF (TG_OP = 'INSERT') THEN
      IF NEW.status = 'paid' THEN
          if new.is_structural then val_type := 'structural_expense'; else val_type := 'expense'; end if;
          if new.payment_method = 'cash' then
            if new.cash_location is not null then val_location := 'hand'; else val_location := 'hand'; end if;
          else
            val_location := 'bank';
          end if;

          insert into cash_journal (user_id, date, type, amount, description, location, currency, reference_id) 
          values (new.user_id, new.date, val_type, -abs(new.amount), new.description, val_location::cash_location, new.currency, new.id);
      END IF;
      RETURN NEW;
  END IF;

  -- UPDATE
  IF (TG_OP = 'UPDATE') THEN
      -- Pending -> Paid
      IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
          if new.is_structural then val_type := 'structural_expense'; else val_type := 'expense'; end if;
          if new.payment_method = 'cash' then
            if new.cash_location is not null then val_location := 'hand'; else val_location := 'hand'; end if;
          else
            val_location := 'bank';
          end if;

          insert into cash_journal (user_id, date, type, amount, description, location, currency, reference_id) 
          values (new.user_id, new.date, val_type, -abs(new.amount), new.description, val_location::cash_location, new.currency, new.id);
      
      -- Paid -> Pending
      ELSIF OLD.status = 'paid' AND NEW.status = 'pending' THEN
          delete from cash_journal where reference_id = OLD.id;
      
      -- Paid -> Paid
      ELSIF OLD.status = 'paid' AND NEW.status = 'paid' THEN
           UPDATE cash_journal
           SET amount = -abs(NEW.amount), date = NEW.date, description = NEW.description
           WHERE reference_id = NEW.id;
      END IF;
      
      RETURN NEW;
  END IF;
  
  -- DELETE
  IF (TG_OP = 'DELETE') THEN
      delete from cash_journal where reference_id = OLD.id;
      RETURN OLD;
  END IF;

  return null;
end;
$$ language plpgsql;

drop trigger if exists on_expense_insert on expenses;
create trigger on_expense_insert after insert on expenses for each row execute function sync_expense_to_journal();
drop trigger if exists on_expense_update on expenses;
create trigger on_expense_update after update on expenses for each row execute function sync_expense_to_journal();
drop trigger if exists on_expense_delete on expenses;
create trigger on_expense_delete after delete on expenses for each row execute function sync_expense_to_journal();


-- Purchase -> Journal
create or replace function log_purchase_to_journal() returns trigger as $$
declare
  v_location text;
begin
  if new.payment_method = 'cash' then v_location := 'hand'; else v_location := 'bank'; end if;
  insert into cash_journal (date, location, amount, type, reference_id, description, user_id)
  values (new.date, v_location, -abs(new.total_amount), 'purchase', new.id, 'Compra: ' || coalesce(new.provider, 'Proveedor'), new.user_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_purchase_journal on purchases;
create trigger tr_purchase_journal after insert on purchases for each row execute procedure log_purchase_to_journal();

create or replace function handle_purchase_deletion() returns trigger security definer as $$
begin
    delete from cash_journal where reference_id = OLD.id and type = 'purchase';
    return OLD;
end;
$$ language plpgsql;

drop trigger if exists tr_purchase_delete_journal on purchases;
create trigger tr_purchase_delete_journal after delete on purchases for each row execute procedure handle_purchase_deletion();


-- Income Payment -> Journal
create or replace function sync_income_journal_entry() returns trigger as $$
declare
  v_amount numeric;
  v_description text;
  v_location text;
begin
  if NEW.method = 'cash' then v_location := 'hand'; else v_location := 'bank'; end if;
  if NEW.method = 'card' then v_amount := NEW.amount * 0.96; else v_amount := NEW.amount; end if;
  v_description := 'Ingreso: ' || NEW.method;

  if (TG_OP = 'INSERT') then
    insert into cash_journal (date, amount, type, description, location, user_id, reference_id, created_at)
    values (NEW.created_at, v_amount, 'income', v_description, v_location::cash_location, (select user_id from daily_incomes where id = NEW.daily_income_id), NEW.id, NEW.created_at);
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    update cash_journal set amount = v_amount, location = v_location::cash_location where reference_id = NEW.id and type = 'income';
    return NEW;
  elsif (TG_OP = 'DELETE') then
    delete from cash_journal where reference_id = OLD.id and type = 'income';
    return OLD;
  end if;
  return NULL;
end;
$$ language plpgsql;

drop trigger if exists tr_sync_income_journal on income_payments;
create trigger tr_sync_income_journal after insert or update or delete on income_payments for each row execute procedure sync_income_journal_entry();
