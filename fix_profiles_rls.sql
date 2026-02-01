-- Enable RLS on profiles (just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- DROP existing reading policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- CREATE a new policy that allows ANY authenticated user to see ALL profiles
-- This is necessary so the "Encargado de Cierre" dropdown can list all staff members.
CREATE POLICY "Authenticated users can view all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
