-- Drop existing SELECT and UPDATE policies
DROP POLICY "Users can view assigned tasks or privileged roles view all" ON public.tasks;
DROP POLICY "Users can update visible tasks" ON public.tasks;

-- Recreate SELECT policy including ops role
CREATE POLICY "Users can view assigned tasks or privileged roles view all"
ON public.tasks
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'dev'::user_role)
  OR has_role(auth.uid(), 'ops'::user_role)
  OR (auth.uid() = ANY (assigned_to))
  OR ((type = 'lead-alert'::task_type) AND (status = 'pending'::task_status))
);

-- Recreate UPDATE policy including ops role
CREATE POLICY "Users can update visible tasks"
ON public.tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'dev'::user_role)
  OR has_role(auth.uid(), 'ops'::user_role)
  OR (auth.uid() = ANY (assigned_to))
  OR ((type = 'lead-alert'::task_type) AND (status = 'pending'::task_status))
);