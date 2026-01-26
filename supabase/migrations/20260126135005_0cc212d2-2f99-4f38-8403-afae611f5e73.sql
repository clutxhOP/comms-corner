-- Fix: allow users to mark unassigned (broadcast) tasks as done
-- Existing SELECT policy allows viewing tasks when assigned_to IS NULL, but UPDATE policy did not.

DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;

CREATE POLICY "Users can update visible tasks"
ON public.tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR auth.uid() = ANY(assigned_to)
  OR assigned_to IS NULL
);
