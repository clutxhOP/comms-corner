-- Drop all policies that depend on tasks.assigned_to
DROP POLICY IF EXISTS "Users can view assigned tasks or admins view all" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can insert task comments" ON public.task_comments;

-- Drop the foreign key constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

-- Change assigned_to from single UUID to array of UUIDs for multi-user assignment
ALTER TABLE public.tasks 
  ALTER COLUMN assigned_to TYPE uuid[] USING CASE WHEN assigned_to IS NULL THEN NULL ELSE ARRAY[assigned_to] END;

-- Recreate tasks RLS policies with array check
CREATE POLICY "Users can view assigned tasks or admins view all" 
ON public.tasks 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  OR auth.uid() = ANY(assigned_to) 
  OR assigned_to IS NULL
);

CREATE POLICY "Users can update assigned tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  OR auth.uid() = ANY(assigned_to)
);

-- Recreate task_comments RLS policies with array check
CREATE POLICY "Users can view task comments" 
ON public.task_comments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  OR EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_comments.task_id 
    AND (auth.uid() = ANY(t.assigned_to) OR t.created_by = auth.uid())
  )
);

CREATE POLICY "Users can insert task comments" 
ON public.task_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_comments.task_id 
    AND (auth.uid() = ANY(t.assigned_to) OR t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);