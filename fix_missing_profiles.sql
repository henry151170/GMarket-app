-- 1. REPARAR EL TRIGGER (Asegurar que existe y funciona)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. RECUPERAR USUARIOS PERDIDOS
-- Inserta en perfiles a cualquier usuario que exista en Auth pero no tenga perfil
insert into public.profiles (id, email, full_name, role)
select 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Usuario Recuperado'), 
  'worker'
from auth.users
where id not in (select id from public.profiles);

-- 3. CONFIRMAR
-- Si el usuario "admin" estaba intentando crear un vendedor,
-- este script probablemente lo recuperará como 'worker'. 
-- El admin podrá luego editarlo en la tabla o borrarlo y crearlo de nuevo.
