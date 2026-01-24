-- Add mentions column to task_comments for storing mentioned user IDs
ALTER TABLE public.task_comments 
ADD COLUMN mentions uuid[] DEFAULT '{}';

-- Create index for faster mention lookups
CREATE INDEX idx_task_comments_mentions ON public.task_comments USING GIN(mentions);

-- Update RLS policy to allow users who are mentioned to view comments
DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;
CREATE POLICY "Users can view task comments" 
ON public.task_comments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  OR (EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_comments.task_id 
    AND (auth.uid() = ANY(t.assigned_to) OR t.created_by = auth.uid())
  ))
  OR auth.uid() = ANY(mentions)
);