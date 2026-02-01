-- 1. CREAR FUNCION SEGURA PARA CONSULTAR ROL (Rompe el bucle infinito)
-- Esta función se ejecuta con permisos de creador (bypass RLS)
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

-- 2. REPARAR LA POLITICA VISUAL (Usando la función segura)
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins view all profiles" on profiles;

-- Politica limpia:
-- "Ver perfiles si soy el dueño O si soy admin"
create policy "View profiles policy" on profiles
for select using (
  auth.uid() = id 
  OR 
  public.is_admin()
);

-- 3. BONUS: REPARAR TAMBIEN EL "INSERT" POR SI ACASO
drop policy if exists "Admins can insert profiles" on profiles;
-- Generalmente el trigger inserta, pero por si acaso
create policy "System insert profiles" on profiles for insert with check (true);
