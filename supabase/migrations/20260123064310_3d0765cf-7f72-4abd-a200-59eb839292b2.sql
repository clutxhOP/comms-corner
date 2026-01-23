-- Add error-alert to task_type enum
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'error-alert';

-- Create personal access tokens table for permanent API access
CREATE TABLE public.personal_access_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    token_hash text NOT NULL UNIQUE,
    token_prefix text NOT NULL,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own tokens"
    ON public.personal_access_tokens
    FOR SELECT
    USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Only the token owner can create their tokens
CREATE POLICY "Users can create own tokens"
    ON public.personal_access_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete (revoke) their own tokens, admins can revoke any
CREATE POLICY "Users can revoke own tokens or admins any"
    ON public.personal_access_tokens
    FOR UPDATE
    USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Actual deletion only by admins
CREATE POLICY "Admins can delete tokens"
    ON public.personal_access_tokens
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'));

-- Index for fast token lookup
CREATE INDEX idx_pat_token_hash ON public.personal_access_tokens(token_hash);
CREATE INDEX idx_pat_user_id ON public.personal_access_tokens(user_id);