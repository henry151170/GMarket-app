-- ============================================================================
-- SCRIPT MAESTRO DE MIGRACIÓN - APP FINANZAS PRO (v1.0)
-- Aplica todas las estructuras y correcciones de lógica de negocio (GMarket)
-- Compatible con: PostgreSQL / Supabase
-- ============================================================================

-- 1. ASEGURAR COLUMNAS NECESARIAS
-- ===============================

-- Tabla Expenses: Flag para diferenciar gastos Admin vs Operarios
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'expenses' and column_name = 'is_structural') then
        alter table expenses add column is_structural boolean default false;
    end if; 
end $$;

-- 2. LIMPIEZA DE TRIGGERS ANTIGUOS/CONFLICTIVOS
-- =============================================
drop trigger if exists trigger_sync_daily_incomes_from_journal on daily_incomes;
drop function if exists sync_daily_incomes_from_journal();

drop trigger if exists sync_purchase_to_journal on purchases;
drop function if exists sync_purchase_to_journal();

drop trigger if exists on_purchase_delete on purchases;
drop function if exists delete_journal_entry_by_origin();

-- 3. FUNCIONES Y TRIGGERS: CONTROL DE GASTOS
-- ==========================================

create or replace function sync_expense_to_journal() returns trigger as $$
declare
  val_location cash_location;
  val_type text;
begin
  -- 1. Determine Type based on is_structural flag
  if new.is_structural then
      val_type := 'structural_expense'; -- Admin Panel (Deducts from Cash in Dashboard)
  else
      val_type := 'expense'; -- Worker Panel (Does NOT deduct from Cash in Dashboard)
  end if;

  -- 2. Determine Location
  if new.payment_method = 'cash' then
    if new.cash_location is not null then
       val_location := 'hand'; -- Custom cash locations map to 'hand' for now
    else
       val_location := 'hand';
    end if;
  else
    val_location := 'bank';
  end if;

  -- 3. Insert into Journal
  insert into cash_journal (
    user_id, date, type, amount, description, location, currency, origin_id, reference_id
  ) values (
    new.user_id, 
    new.date, 
    val_type, -- Uses dynamic type
    -abs(new.amount), -- Always negative
    new.description, 
    val_location, 
    new.currency, 
    new.id, -- origin_id (legacy)
    new.id  -- reference_id (new standard)
  );

  return new;
end;
$$ language plpgsql;

-- Re-create Trigger for Insert
drop trigger if exists on_expense_insert on expenses;
create trigger on_expense_insert
  after insert on expenses
  for each row execute procedure sync_expense_to_journal();

-- Function to Handle Expense Deletion (With Security Definer for RLS Bypass)
create or replace function delete_expense_journal_entry() returns trigger security definer as $$
begin
    delete from cash_journal 
    where reference_id = OLD.id 
      and type IN ('expense', 'structural_expense');
    return OLD;
end;
$$ language plpgsql;

-- Re-create Trigger for Delete
drop trigger if exists on_expense_delete on expenses;
create trigger on_expense_delete
  after delete on expenses
  for each row execute procedure delete_expense_journal_entry();


-- 4. FUNCIONES Y TRIGGERS: COMPRAS (Mercadería)
-- =============================================

create or replace function log_purchase_to_journal() returns trigger as $$
declare
  v_location cash_location;
begin
  if new.payment_method = 'cash' then
    v_location := 'hand';
  else
    v_location := 'bank';
  end if;

  insert into cash_journal (date, location, amount, type, reference_id, description, user_id)
  values (
      new.date, 
      v_location, 
      -abs(new.total_amount), 
      'purchase', 
      new.id, 
      'Compra: ' || coalesce(new.provider, 'Proveedor Desc'), 
      new.user_id
  );
  
  return new;
end;
$$ language plpgsql;

create or replace function handle_purchase_deletion() returns trigger security definer as $$
begin
    delete from cash_journal
    where reference_id = OLD.id
      and type = 'purchase';
    return OLD;
end;
$$ language plpgsql;

-- Triggers Compras
drop trigger if exists tr_purchase_journal on purchases;
create trigger tr_purchase_journal
  after insert on purchases
  for each row execute procedure log_purchase_to_journal();

drop trigger if exists tr_purchase_delete_journal on purchases;
create trigger tr_purchase_delete_journal
  after delete on purchases
  for each row execute procedure handle_purchase_deletion();


-- 5. FUNCIONES Y TRIGGERS: OTROS INGRESOS
-- =======================================

create or replace function log_other_income_to_journal() returns trigger as $$
declare
  v_location cash_location;
begin
  if new.payment_method = 'cash' then
    v_location := 'hand';
  else
    v_location := 'bank';
  end if;

  insert into cash_journal (date, location, amount, type, reference_id, description, user_id)
  values (new.date, v_location, new.amount, 'other_income', new.id, 'Ingreso: ' || new.description, new.user_id);
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_other_income_journal on other_incomes;
create trigger tr_other_income_journal
  after insert on other_incomes
  for each row execute procedure log_other_income_to_journal();


-- 6. PERMISOS Y SEGURIDAD (RLS)
-- =============================

-- Habilitar RLS en cash_journal si no está
alter table cash_journal enable row level security;

-- Política de Eliminación Permisiva (Ya cubierto por Security Definer en triggers, pero bueno tenerlo)
drop policy if exists "Delete Journal" on cash_journal;
create policy "Delete Journal" on cash_journal for delete to authenticated using (true);
