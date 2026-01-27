-- Add mentions column to chat_messages for tracking @mentions
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS mentions uuid[] DEFAULT '{}';

-- Create chat_notifications table for mention notifications
CREATE TABLE IF NOT EXISTS public.chat_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  message_preview text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on chat_notifications
ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.chat_notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert notifications for mentions
CREATE POLICY "Users can insert notifications"
ON public.chat_notifications FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.chat_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.chat_notifications FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster notification lookups
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user_id ON public.chat_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_unread ON public.chat_notifications(user_id) WHERE read_at IS NULL;

-- Add columns to tasks for dev close workflow
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS sent_to_ops boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ops_reason text,
ADD COLUMN IF NOT EXISTS closed_by_dev uuid,
ADD COLUMN IF NOT EXISTS dev_close_response jsonb;

-- Enable realtime for chat_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_notifications;