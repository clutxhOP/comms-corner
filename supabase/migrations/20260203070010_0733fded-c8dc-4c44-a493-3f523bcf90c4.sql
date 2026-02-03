-- Create message read receipts table to track which messages each user has read
CREATE TABLE public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Create index for efficient queries
CREATE INDEX idx_read_receipts_user_channel ON public.message_read_receipts(user_id, channel_id);
CREATE INDEX idx_read_receipts_message ON public.message_read_receipts(message_id);

-- Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Users can view their own read receipts
CREATE POLICY "Users can view own read receipts"
ON public.message_read_receipts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own read receipts
CREATE POLICY "Users can insert own read receipts"
ON public.message_read_receipts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own read receipts
CREATE POLICY "Users can update own read receipts"
ON public.message_read_receipts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own read receipts
CREATE POLICY "Users can delete own read receipts"
ON public.message_read_receipts
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;