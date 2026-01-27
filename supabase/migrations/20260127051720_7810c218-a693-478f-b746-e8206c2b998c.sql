-- Fix 1: Restrict profiles visibility to own profile or admins
-- (Currently allows all authenticated users to see all profiles)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create view for displaying names only (for task assignment, mentions, etc.)
CREATE OR REPLACE VIEW public.profiles_display 
WITH (security_invoker=on) AS
  SELECT user_id, full_name
  FROM public.profiles;

-- Admins can view all profiles, users can only view their own
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Fix 2: Create view for personal_access_tokens that excludes token_hash
-- Users should never see token hashes through the API
CREATE OR REPLACE VIEW public.personal_access_tokens_safe
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    name,
    token_prefix,
    created_at,
    expires_at,
    revoked_at,
    last_used_at
  FROM public.personal_access_tokens;

-- Fix 3: Restrict unassigned tasks visibility to admins and devs only
-- (Currently NULL assigned_to is visible to ALL authenticated users)
DROP POLICY IF EXISTS "Users can view assigned tasks or admins view all" ON public.tasks;

CREATE POLICY "Users can view assigned tasks or privileged roles view all"
ON public.tasks
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'dev'::user_role)
  OR auth.uid() = ANY(assigned_to)
);

-- Also update the UPDATE policy to match the new SELECT restriction
DROP POLICY IF EXISTS "Users can update visible tasks" ON public.tasks;

CREATE POLICY "Users can update visible tasks"
ON public.tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'dev'::user_role)
  OR auth.uid() = ANY(assigned_to)
);