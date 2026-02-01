-- Enable pgcrypto for password hashing
create extension if not exists "pgcrypto";

-- Drop old function if exists to avoid conflicts
drop function if exists create_user_with_role;

-- Create corrected function
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
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
     raise exception 'Permiso denegado: Solo administradores';
  end if;

  -- Insert directly into auth.users
  -- Uses email_confirmed_at to auto-verify, avoiding confirmed_at error
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
    now(), -- Auto-confirm
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', new_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) returning id into new_id;

  -- Wait for trigger to create profile, then update role
  -- Note: Trigger usually runs AFTER INSERT. 
  -- We just update the profile row that the trigger created.
  update public.profiles
  set role = new_role::user_role
  where id = new_id;

end;
$$ language plpgsql security definer;
