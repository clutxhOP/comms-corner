-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments', 
  'chat-attachments', 
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
    'application/pdf',
    'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
);

-- Create storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create chat_attachments table to store file metadata
CREATE TABLE public.chat_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_attachments
CREATE POLICY "Users can view attachments in their channels"
ON public.chat_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_channels c ON c.id = m.channel_id
    WHERE m.id = chat_attachments.message_id
    AND (
      has_role(auth.uid(), 'admin'::user_role)
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = ANY(c.allowed_roles)
      )
    )
  )
);

CREATE POLICY "Users can insert their own attachments"
ON public.chat_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
ON public.chat_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_chat_attachments_message_id ON public.chat_attachments(message_id);