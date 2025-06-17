
-- 1. Remove the problematic RLS policy causing recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- 2. Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT is_admin FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- 3. Create safe RLS policy for admin to view all user_profiles using above function
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (public.is_current_user_admin());
