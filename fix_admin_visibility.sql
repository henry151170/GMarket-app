-- 1. REPARAR VISIBILIDAD DE ADMINS
-- A veces las políticas recursivas fallan. Esta es una versión simplificada.

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;

-- Nueva politica:
-- "Un usuario puede ver TODOS los perfiles SI su propio rol es 'admin'"
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  exists (
    select 1 from profiles 
    where id = auth.uid() 
    and role::text = 'admin'
  )
);

-- 2. ASEGURARSE QUE EL ADMIN ACTUAL TENGA ROL DE ADMIN
-- (Reemplaza con tu email real si es necesario, o confía en que ya lo tienes)
-- update profiles set role = 'admin' where email = 'tu_email@gmail.com';

-- 3. VERIFICACION DE DIAGNOSTICO
-- Si has ejecutado esto y aun no ves nada, ejecuta:
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- (Solo temporalmente para probar).
