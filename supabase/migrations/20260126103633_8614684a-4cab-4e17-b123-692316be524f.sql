-- Add columns for message editing and deletion
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create message reactions table
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on reactions
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reactions
CREATE POLICY "Users can view reactions in their channels"
ON public.chat_message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_channels c ON c.id = m.channel_id
    WHERE m.id = chat_message_reactions.message_id
    AND (
      has_role(auth.uid(), 'admin'::user_role)
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(c.allowed_roles)
      )
    )
  )
);

CREATE POLICY "Users can add reactions"
ON public.chat_message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_channels c ON c.id = m.channel_id
    WHERE m.id = chat_message_reactions.message_id
    AND (
      has_role(auth.uid(), 'admin'::user_role)
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(c.allowed_roles)
      )
    )
  )
);

CREATE POLICY "Users can remove own reactions"
ON public.chat_message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Add UPDATE and DELETE policies for chat_messages (for editing/deleting own messages)
CREATE POLICY "Users can update own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;