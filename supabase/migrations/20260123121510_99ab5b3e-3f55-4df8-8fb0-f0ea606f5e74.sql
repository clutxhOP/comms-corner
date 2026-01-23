-- Create webhook_logs table to track webhook executions
CREATE TABLE public.webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE,
    webhook_name text NOT NULL,
    trigger_action text NOT NULL,
    request_url text NOT NULL,
    request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    response_status integer,
    response_body text,
    error_message text,
    success boolean NOT NULL DEFAULT false,
    executed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all webhook logs"
ON public.webhook_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Devs can view their own webhook logs
CREATE POLICY "Devs can view own webhook logs"
ON public.webhook_logs FOR SELECT
USING (
    has_role(auth.uid(), 'dev'::user_role) AND 
    webhook_id IN (SELECT id FROM public.webhooks WHERE user_id = auth.uid())
);

-- Allow inserts for authenticated users (will be done by the hook)
CREATE POLICY "Users can insert webhook logs"
ON public.webhook_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Index for faster queries
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_executed_at ON public.webhook_logs(executed_at DESC);