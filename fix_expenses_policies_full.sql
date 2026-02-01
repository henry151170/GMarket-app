-- FIX: COMPLETE RESET OF EXPENSES POLICIES
-- This enables correct visibility for both Workers (own expenses) and Admins (all expenses).

-- 1. Asegurar función de admin (por si no se corrió el script anterior)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid()
    and role::text = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Limpiar Politicas Antiguas
DROP POLICY IF EXISTS "Workers view own expenses" ON expenses;
DROP POLICY IF EXISTS "Admins view all expenses" ON expenses;
DROP POLICY IF EXISTS "Workers can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Workers insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Workers view own expenses" ON expenses;
DROP POLICY IF EXISTS "Workers can insert expenses" ON expenses;

-- 3. Crear Nuevas Politicas Unificadas

-- SELECT (Ver): Worker ve lo suyo, Admin ve todo
CREATE POLICY "View expenses policy" ON expenses
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- INSERT (Crear): Worker crea lo suyo, Admin puede crear para cualquiera (o suyo)
CREATE POLICY "Insert expenses policy" ON expenses
FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- UPDATE (Editar): Worker edita lo suyo, Admin edita todo
CREATE POLICY "Update expenses policy" ON expenses
FOR UPDATE USING (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- DELETE (Borrar): Worker borra lo suyo, Admin borra todo
CREATE POLICY "Delete expenses policy" ON expenses
FOR DELETE USING (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- 4. Asegurar Permisos
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON expenses TO service_role;
