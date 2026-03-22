-- ============================================================================
-- USER MANAGEMENT RPC FIX (CREATE & DELETE)
-- Installs the necessary Supabase RPC functions to allow Admins to manage users.
-- Run this script in the SQL Editor of any project (Geekshop, GMarket, etc.)
-- ============================================================================

-- 1. Ensure pgcrypto extension is available for password hashing
create extension if not exists "pgcrypto";

-- 2. Ensure user_role enum exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN 
    CREATE TYPE public.user_role AS ENUM ('admin', 'worker'); 
  END IF; 
END $$;

-- ============================================================================
-- 3. CREATE USER FUNCTION
-- ============================================================================
drop function if exists public.create_user_with_role;

create or replace function public.create_user_with_role(
  new_email text,
  new_password text,
  new_full_name text,
  new_role text
)
returns void as $$
declare
  new_id uuid;
begin
  -- VERIFICACION DE PERMISOS: Solo admins
  if not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'admin') then
     raise exception 'Permiso denegado: Solo administradores pueden crear usuarios';
  end if;

  -- Insert directly into auth.users (Supabase Auth)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    new_email,
    crypt(new_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', new_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) returning id into new_id;

  -- Insert or Update the profile. 
  -- We do this in case the auth trigger 'on_auth_user_created' doesn't exist in this specific project.
  insert into public.profiles (id, email, full_name, role)
  values (new_id, new_email, new_full_name, new_role::public.user_role)
  on conflict (id) do update set
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

end;
$$ language plpgsql security definer;


-- ============================================================================
-- 4. DELETE USER FUNCTION
-- ============================================================================
drop function if exists public.delete_user_by_admin;

create or replace function public.delete_user_by_admin(
  target_user_id uuid
)
returns void as $$
begin
  -- VERIFICACION DE PERMISOS: Solo admins
  if not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'admin') then
     raise exception 'Permiso denegado: Solo administradores pueden eliminar usuarios';
  end if;

  -- Proteccion adicional: No permitir que un admin se elimine a si mismo por accidente
  if target_user_id = auth.uid() then
     raise exception 'Operación no permitida: No puedes eliminar tu propia cuenta';
  end if;

  -- Eliminar de auth.users (Esto eliminará en cascada de public.profiles gracias a ON DELETE CASCADE)
  delete from auth.users where id = target_user_id;

end;
$$ language plpgsql security definer;

-- Reload schema cache just in case
NOTIFY pgrst, 'reload schema';
