-- Create webhooks table for storing user-defined webhook configurations
CREATE TABLE public.webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    trigger_action text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all webhooks
CREATE POLICY "Admins can view all webhooks"
ON public.webhooks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Devs can view their own webhooks
CREATE POLICY "Devs can view own webhooks"
ON public.webhooks
FOR SELECT
USING (has_role(auth.uid(), 'dev'::user_role) AND auth.uid() = user_id);

-- Admins and devs can create webhooks
CREATE POLICY "Users can create own webhooks"
ON public.webhooks
FOR INSERT
WITH CHECK ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'dev'::user_role)) AND auth.uid() = user_id);

-- Users can update their own webhooks, admins can update any
CREATE POLICY "Users can update own webhooks or admins any"
ON public.webhooks
FOR UPDATE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::user_role));

-- Users can delete their own webhooks, admins can delete any
CREATE POLICY "Users can delete own webhooks or admins any"
ON public.webhooks
FOR DELETE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();