-- Step 1: Drop all dependent policies first
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view assigned tasks or admins view all" ON public.tasks;
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;

-- Step 2: Drop the old has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Step 3: Create new role enum with dev/ops
CREATE TYPE public.user_role AS ENUM ('admin', 'dev', 'ops');

-- Step 4: Add new column, migrate data, drop old column
ALTER TABLE public.user_roles ADD COLUMN new_role user_role;
UPDATE public.user_roles SET new_role = 'admin' WHERE role = 'admin';
UPDATE public.user_roles SET new_role = 'ops' WHERE role = 'user';
ALTER TABLE public.user_roles DROP COLUMN role;
ALTER TABLE public.user_roles RENAME COLUMN new_role TO role;
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'ops';

-- Step 5: Drop old enum type
DROP TYPE public.app_role;

-- Step 6: Create new has_role function with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 7: Recreate user_roles policies with new enum
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role) OR (user_id = auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Step 8: Recreate tasks policies with new enum
CREATE POLICY "Users can view assigned tasks or admins view all"
ON public.tasks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role) OR (assigned_to = auth.uid()) OR (assigned_to IS NULL));

CREATE POLICY "Admins can insert tasks"
ON public.tasks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can update assigned tasks"
ON public.tasks
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role) OR (assigned_to = auth.uid()));

CREATE POLICY "Admins can delete tasks"
ON public.tasks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Step 9: Drop the unique constraint to allow multiple roles per user
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Step 10: Create task_comments table for task discussions
CREATE TABLE public.task_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments"
ON public.task_comments
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::user_role) 
    OR EXISTS (
        SELECT 1 FROM public.tasks t 
        WHERE t.id = task_id 
        AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
);

CREATE POLICY "Users can insert task comments"
ON public.task_comments
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.tasks t 
        WHERE t.id = task_id 
        AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
    )
);

-- Step 11: Create chat_channels table
CREATE TABLE public.chat_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text,
    allowed_roles user_role[] NOT NULL DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.chat_channels (name, slug, description, allowed_roles) VALUES
    ('Main', 'main', 'General channel for all team members', ARRAY['admin', 'dev', 'ops']::user_role[]),
    ('Developers', 'dev', 'Channel for development team', ARRAY['admin', 'dev']::user_role[]),
    ('Operations', 'ops', 'Channel for operations team', ARRAY['admin', 'ops']::user_role[]);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view allowed channels"
ON public.chat_channels
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = ANY(allowed_roles)
    )
);

-- Step 12: Create chat_messages table
CREATE TABLE public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channel messages"
ON public.chat_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_channels c
        WHERE c.id = channel_id
        AND (
            has_role(auth.uid(), 'admin'::user_role)
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur 
                WHERE ur.user_id = auth.uid() 
                AND ur.role = ANY(c.allowed_roles)
            )
        )
    )
);

CREATE POLICY "Users can insert channel messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.chat_channels c
        WHERE c.id = channel_id
        AND (
            has_role(auth.uid(), 'admin'::user_role)
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur 
                WHERE ur.user_id = auth.uid() 
                AND ur.role = ANY(c.allowed_roles)
            )
        )
    )
);

-- Enable realtime for chat messages and task comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;