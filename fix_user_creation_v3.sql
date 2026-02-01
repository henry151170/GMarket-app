-- 1. ASEGURAR QUE EL TIPO EXISTE
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN 
    CREATE TYPE public.user_role AS ENUM ('admin', 'worker'); 
  END IF; 
END $$;

-- 2. CORREGIR EL TRIGGER
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    -- Usa el nombre de la metadata, o pone 'Usuario' si viene vacio/nulo
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'), 
    'worker'::public.user_role
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3. FUNCION COMPLETA CORREGIDA (Con tipos explícitos)
create extension if not exists "pgcrypto";

drop function if exists create_user_with_role;

create or replace function create_user_with_role(
  new_email text,
  new_password text,
  new_full_name text,
  new_role text
)
returns void as $$
declare
  new_id uuid;
begin
  -- Check admin permission
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin'::public.user_role) then
     raise exception 'Permiso denegado: Solo administradores';
  end if;

  -- Insert directly into auth.users with correct fields
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

  -- Update the created profile with the correct role
  -- Using public.user_role explicitly to avoid "type not found" error
  update public.profiles
  set 
    role = new_role::public.user_role,
    full_name = new_full_name 
  where id = new_id;

end;
$$ language plpgsql security definer;
