-- Update RLS policy for tasks so lead-alert tasks are visible to all authenticated users
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view assigned tasks or privileged roles view all" ON public.tasks;

-- Create new SELECT policy that makes lead-alert tasks visible to everyone
CREATE POLICY "Users can view assigned tasks or privileged roles view all"
ON public.tasks FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  OR has_role(auth.uid(), 'dev'::user_role) 
  OR (auth.uid() = ANY (assigned_to))
  OR (type = 'lead-alert' AND status = 'pending')  -- Lead alerts visible to all until closed
);

-- Update UPDATE policy to allow all roles to update lead-alerts  
DROP POLICY IF EXISTS "Users can update visible tasks" ON public.tasks;

CREATE POLICY "Users can update visible tasks"
ON public.tasks FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  OR has_role(auth.uid(), 'dev'::user_role) 
  OR (auth.uid() = ANY (assigned_to))
  OR (type = 'lead-alert' AND status = 'pending')  -- Anyone can update pending lead alerts
);