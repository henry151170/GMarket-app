-- ============================================================================
-- MASTER SCHEMA - APP FINANZAS PRO (GOLDEN STATE)
-- Generated: 2026-02-07
-- Use this script to initialize NEW Supabase projects (Safri, GeekShop, GMobile)
-- ============================================================================

-- 1. EXTENSIONS
-- =============
create extension if not exists "uuid-ossp";

-- 2. ENUMS
-- ========
do $$ begin
    create type user_role as enum ('admin', 'worker');
exception when duplicate_object then null; end $$;

do $$ begin
    create type payment_method as enum ('cash', 'yape', 'card', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
    create type cash_location as enum ('hand', 'bank');
exception when duplicate_object then null; end $$;

do $$ begin
    create type expense_category as enum (
        'packaging', 'cleaning', 'transport', 'advertising', 'maintenance', 
        'food', 'wages', 'utilities', 'rent', 'other'
    );
exception when duplicate_object then null; end $$;

do $$ begin
    create type expense_status as enum ('paid', 'pending');
exception when duplicate_object then null; end $$;

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

-- DAILY INCOMES
create table if not exists daily_incomes (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  total_facturas numeric(10,2) default 0,
  total_boletas numeric(10,2) default 0,
  total_notas_venta numeric(10,2) default 0,
  -- Note: Generated column syntax compatible with Postgres 12+
  total_calculated numeric(10,2) generated always as (
      COALESCE(total_facturas, 0) + COALESCE(total_boletas, 0) + COALESCE(total_notas_venta, 0)
  ) stored,
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
  category text not null, -- Can be mapped to expense_category enum in code
  description text,
  amount numeric(10,2) not null check (amount > 0),
  date date not null default current_date,
  payment_method text not null, -- Using text to be flexible or enum if strict
  cash_location text, -- Using text to be flexible
  user_id uuid references profiles(id) not null,
  is_fixed boolean default false,
  is_structural boolean default false, -- NEW COLUMN
  currency text default 'PEN',
  status expense_status default 'paid', -- added for pending templates
  created_at timestamptz default now()
);

-- PURCHASES (Mercadería)
create table if not exists purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  date date not null default current_date,
  total_amount numeric(10,2) not null default 0,
  payment_method text not null,
  status text default 'completed',
  notes text,
  provider text,
  description text,
  created_at timestamptz default now()
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

-- FUND TRANSFERS
create table if not exists fund_transfers (
  id uuid default uuid_generate_v4() primary key,
  amount numeric(10,2) not null check (amount > 0),
  date date not null default current_date,
  origin text not null, -- cash_location
  destination text not null, -- cash_location
  description text,
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  check (origin != destination)
);

-- CASH JOURNAL
create table if not exists cash_journal (
  id uuid default uuid_generate_v4() primary key,
  date timestamptz default now(),
  location text not null, -- cash_location
  amount numeric(10,2) not null,
  type text not null, -- 'income', 'expense', 'structural_expense', 'purchase', 'other_income', 'transfer_in', 'transfer_out'
  reference_id uuid,
  description text,
  user_id uuid references profiles(id),
  currency text default 'PEN',
  created_at timestamptz default now(),
  origin_id uuid -- Legacy support
);

-- 4. RLS POLICIES (Basic)
-- =======================
-- Enable RLS
alter table profiles enable row level security;
alter table daily_incomes enable row level security;
alter table expenses enable row level security;
alter table purchases enable row level security;
alter table income_payments enable row level security;
alter table cash_journal enable row level security;
alter table other_incomes enable row level security;

-- PROFILES
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- DAILY INCOMES
create policy "Users view own incomes" on daily_incomes for select using (auth.uid() = user_id);
create policy "Admins view all incomes" on daily_incomes for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users insert own incomes" on daily_incomes for insert with check (auth.uid() = user_id);
create policy "Admins delete incomes" on daily_incomes for delete using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- EXPENSES
create policy "Users view own expenses" on expenses for select using (auth.uid() = user_id);
create policy "Admins view all expenses" on expenses for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users insert own expenses" on expenses for insert with check (auth.uid() = user_id);
create policy "Users delete own expenses" on expenses for delete using (auth.uid() = user_id);

-- PURCHASES
create policy "Users view own purchases" on purchases for select using (auth.uid() = user_id);
create policy "Admins view all purchases" on purchases for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users insert own purchases" on purchases for insert with check (auth.uid() = user_id);
create policy "Users delete own purchases" on purchases for delete using (auth.uid() = user_id);

-- CASH JOURNAL
create policy "Users view own journal" on cash_journal for select using (auth.uid() = user_id);
create policy "Admins view all journal" on cash_journal for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Delete Journal" on cash_journal for delete to authenticated using (true); -- Managed by triggers/security definer

-- INCOME PAYMENTS
create policy "Users view own payments" on income_payments for select using (exists (select 1 from daily_incomes where id = income_payments.daily_income_id and user_id = auth.uid()));
create policy "Admins view all payments" on income_payments for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users insert own payments" on income_payments for insert with check (exists (select 1 from daily_incomes where id = daily_income_id and user_id = auth.uid()));

-- OTHER INCOMES
create policy "Users view own other incomes" on other_incomes for select using (auth.uid() = user_id);
create policy "Admins view all other incomes" on other_incomes for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users insert own other incomes" on other_incomes for insert with check (auth.uid() = user_id);
create policy "Users delete own other incomes" on other_incomes for delete using (auth.uid() = user_id);

-- FUND TRANSFERS
alter table fund_transfers enable row level security;
create policy "Admins manage transfers" on fund_transfers for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- 5. FUNCTIONS & TRIGGERS (LOGIC)
-- ===============================

-- Helper: Handle new user
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'worker');
  return new;
end;
$$ language plpgsql;

-- Trigger: New User
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- LOGIC: EXPENSES -> JOURNAL
create or replace function sync_expense_to_journal() returns trigger as $$
declare
  val_location text;
  val_type text;
begin
  -- 1. HANDLE INSERT
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

  -- 2. HANDLE UPDATE
  IF (TG_OP = 'UPDATE') THEN
      -- Case A: Pending -> Paid (Create Journal Entry)
      IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
          if new.is_structural then val_type := 'structural_expense'; else val_type := 'expense'; end if;
          
          if new.payment_method = 'cash' then
            if new.cash_location is not null then val_location := 'hand'; else val_location := 'hand'; end if;
          else
            val_location := 'bank';
          end if;

          insert into cash_journal (user_id, date, type, amount, description, location, currency, reference_id) 
          values (new.user_id, new.date, val_type, -abs(new.amount), new.description, val_location::cash_location, new.currency, new.id);
      
      -- Case B: Paid -> Pending (Remove Journal Entry)
      ELSIF OLD.status = 'paid' AND NEW.status = 'pending' THEN
          delete from cash_journal where reference_id = OLD.id;
      
      -- Case C: Paid -> Paid (Content Update)
      ELSIF OLD.status = 'paid' AND NEW.status = 'paid' THEN
           UPDATE cash_journal
           SET 
             amount = -abs(NEW.amount),
             date = NEW.date,
             description = NEW.description
           WHERE reference_id = NEW.id;
      END IF;
      
      RETURN NEW;
  END IF;
  
  return null;
end;
$$ language plpgsql;

create trigger on_expense_insert
  after insert on expenses
  for each row execute function sync_expense_to_journal();

create trigger on_expense_update
  after update on expenses
  for each row execute function sync_expense_to_journal();

create or replace function delete_expense_journal_entry() returns trigger security definer as $$
begin
    delete from cash_journal where reference_id = OLD.id and type IN ('expense', 'structural_expense');
    return OLD;
end;
$$ language plpgsql;

create trigger on_expense_delete after delete on expenses for each row execute procedure delete_expense_journal_entry();


-- LOGIC: PURCHASES -> JOURNAL
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

create trigger tr_purchase_journal after insert on purchases for each row execute procedure log_purchase_to_journal();

create or replace function handle_purchase_deletion() returns trigger security definer as $$
begin
    delete from cash_journal where reference_id = OLD.id and type = 'purchase';
    return OLD;
end;
$$ language plpgsql;

create trigger tr_purchase_delete_journal after delete on purchases for each row execute procedure handle_purchase_deletion();


-- LOGIC: OTHER INCOMES -> JOURNAL
create or replace function log_other_income_to_journal() returns trigger as $$
declare
  v_location text;
begin
  if new.payment_method = 'cash' then v_location := 'hand'; else v_location := 'bank'; end if;
  insert into cash_journal (date, location, amount, type, reference_id, description, user_id, currency)
  values (new.date, v_location, new.amount, 'other_income', new.id, 'Ingreso: ' || new.description, new.user_id, new.currency);
  return new;
end;
$$ language plpgsql;

create trigger tr_other_income_journal after insert on other_incomes for each row execute procedure log_other_income_to_journal();

create or replace function delete_other_income_journal_entry() returns trigger security definer as $$
begin
    delete from cash_journal where reference_id = OLD.id and type = 'other_income';
    return OLD;
end;
$$ language plpgsql;

create trigger tr_other_income_delete after delete on other_incomes for each row execute procedure delete_other_income_journal_entry();


-- UTILITY: RESET EXPENSES (Delete All)
create or replace function reset_expenses()
returns boolean
language plpgsql
security definer
as $$
begin
    -- 1. Delete associated journal entries (both types)
    delete from cash_journal 
    where type IN ('expense', 'structural_expense');

    -- 2. Delete all expenses
    delete from expenses;
    
    return true;
end;
$$;

-- PERMISSIONS
GRANT EXECUTE ON FUNCTION reset_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expenses() TO service_role;

