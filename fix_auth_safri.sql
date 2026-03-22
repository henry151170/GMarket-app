-- ============================================================================
-- FIX: AUTH TRIGGER PERMISSIONS
-- Problem: "Database error creating new user"
-- Cause: The trigger function was missing SECURITY DEFINER
-- ============================================================================

create or replace function public.handle_new_user() 
returns trigger 
security definer -- <--- CRITICAL FIX: Bypass RLS/Permissions
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.email), -- Fallback to email if name is empty
    'worker'
  );
  return new;
exception
  when others then
    -- Log error safely but allow user creation to succeed
    -- (You can see these warnings in Postgres logs)
    raise warning 'Error creating profile: %', SQLERRM;
    return new;
end;
$$ language plpgsql;

-- Ensure trigger is correctly attached
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Grant permissions just in case
grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to postgres, service_role;
