-- STEP 1: Drop the broken policy that excludes superadmin
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- STEP 2: Create fixed policy that includes BOTH admin AND superadmin
CREATE POLICY "Admins and superadmins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- STEP 3: Ensure users can ALWAYS read their own role (critical for login bootstrap)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);