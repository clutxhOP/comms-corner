-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create new policies allowing all authenticated users to read profiles
CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Create new policies allowing all authenticated users to read user roles
CREATE POLICY "Authenticated users can read all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);