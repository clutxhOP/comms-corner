-- =============================================================================
-- comms-corner full schema (consolidated from all 41 migrations)
-- Applies to Buddy Supabase: ycjyrjacwhnvulwzbzxw.supabase.co
--
-- NOTE: The original "leads" CRM table has been renamed to "crm_leads"
-- to avoid conflict with the existing Buddy "leads" table (social scraping).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('admin', 'dev', 'ops');

CREATE TYPE public.task_type AS ENUM (
  'lead-approval',
  'lead-alert',
  'lead-outreach',
  'other',
  'error-alert',
  'awaiting-business'
);

CREATE TYPE public.task_status AS ENUM ('pending', 'done', 'approved', 'disapproved');


-- ---------------------------------------------------------------------------
-- 2. UTILITY FUNCTION: update_updated_at_column
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 3. PROFILES
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all profiles
CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Lightweight display view (for task assignment, @mentions, etc.)
CREATE OR REPLACE VIEW public.profiles_display
WITH (security_invoker=on) AS
  SELECT user_id, full_name FROM public.profiles;


-- ---------------------------------------------------------------------------
-- 4. USER ROLES
-- ---------------------------------------------------------------------------

CREATE TABLE public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.user_role NOT NULL DEFAULT 'ops'
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all roles
CREATE POLICY "Authenticated users can read all user roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));


-- ---------------------------------------------------------------------------
-- 5. has_role FUNCTION (defined after user_roles table exists)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


-- ---------------------------------------------------------------------------
-- 6. TASKS
-- ---------------------------------------------------------------------------

CREATE TABLE public.tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text,
  type                public.task_type NOT NULL DEFAULT 'other',
  status              public.task_status NOT NULL DEFAULT 'pending',
  assigned_to         uuid[],
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  updated_at          timestamp with time zone NOT NULL DEFAULT now(),
  -- Dev close workflow
  sent_to_ops         boolean DEFAULT false,
  ops_reason          text,
  closed_by_dev       uuid,
  dev_close_response  jsonb
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assigned tasks or privileged roles view all"
  ON public.tasks FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'dev'::user_role)
    OR public.has_role(auth.uid(), 'ops'::user_role)
    OR (auth.uid() = ANY(assigned_to))
    OR ((type = 'lead-alert'::task_type) AND (status = 'pending'::task_status))
  );

CREATE POLICY "Admins can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can update visible tasks"
  ON public.tasks FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'dev'::user_role)
    OR public.has_role(auth.uid(), 'ops'::user_role)
    OR (auth.uid() = ANY(assigned_to))
    OR ((type = 'lead-alert'::task_type) AND (status = 'pending'::task_status))
  );

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------------
-- 7. TASK COMMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE public.task_comments (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id  uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id  uuid NOT NULL,
  content  text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_task_comments_mentions ON public.task_comments USING GIN(mentions);

CREATE POLICY "Users can view task comments"
  ON public.task_comments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
        AND (auth.uid() = ANY(t.assigned_to) OR t.created_by = auth.uid())
    )
    OR auth.uid() = ANY(mentions)
  );

CREATE POLICY "Users can insert task comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
        AND (auth.uid() = ANY(t.assigned_to) OR t.created_by = auth.uid()
             OR public.has_role(auth.uid(), 'admin'::user_role))
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;


-- ---------------------------------------------------------------------------
-- 8. CHAT CHANNELS
-- ---------------------------------------------------------------------------

CREATE TABLE public.chat_channels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  slug          text NOT NULL UNIQUE,
  description   text,
  allowed_roles public.user_role[] NOT NULL DEFAULT '{}',
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view allowed channels"
  ON public.chat_channels FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(allowed_roles)
    )
  );

INSERT INTO public.chat_channels (name, slug, description, allowed_roles) VALUES
  ('Main',       'main', 'General channel for all team members', ARRAY['admin','dev','ops']::public.user_role[]),
  ('Developers', 'dev',  'Channel for development team',         ARRAY['admin','dev']::public.user_role[]),
  ('Operations', 'ops',  'Channel for operations team',          ARRAY['admin','ops']::public.user_role[]);


-- ---------------------------------------------------------------------------
-- 9. CHAT MESSAGES
-- ---------------------------------------------------------------------------

CREATE TABLE public.chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid NOT NULL,
  content    text NOT NULL,
  mentions   uuid[] DEFAULT '{}',
  edited_at  timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channel messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id
        AND (
          public.has_role(auth.uid(), 'admin'::user_role)
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = ANY(c.allowed_roles)
          )
        )
    )
  );

CREATE POLICY "Users can insert channel messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id
        AND (
          public.has_role(auth.uid(), 'admin'::user_role)
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = ANY(c.allowed_roles)
          )
        )
    )
  );

CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;


-- ---------------------------------------------------------------------------
-- 10. CHAT MESSAGE REACTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE public.chat_message_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  emoji      text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their channels"
  ON public.chat_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages m
      JOIN chat_channels c ON c.id = m.channel_id
      WHERE m.id = chat_message_reactions.message_id
        AND (
          public.has_role(auth.uid(), 'admin'::user_role)
          OR EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = ANY(c.allowed_roles)
          )
        )
    )
  );

CREATE POLICY "Users can add reactions"
  ON public.chat_message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_messages m
      JOIN chat_channels c ON c.id = m.channel_id
      WHERE m.id = chat_message_reactions.message_id
        AND (
          public.has_role(auth.uid(), 'admin'::user_role)
          OR EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = ANY(c.allowed_roles)
          )
        )
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON public.chat_message_reactions FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;


-- ---------------------------------------------------------------------------
-- 11. CHAT ATTACHMENTS (+ storage bucket)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  ARRAY[
    'image/png','image/jpeg','image/jpg','image/gif','image/webp',
    'application/pdf',
    'audio/mpeg','audio/wav','audio/x-m4a','audio/ogg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain',
    'video/mp4','video/quicktime','video/webm'
  ]
);

CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can view chat attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE TABLE public.chat_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  file_name    text NOT NULL,
  file_type    text NOT NULL,
  file_size    integer NOT NULL,
  storage_path text NOT NULL,
  url          text NOT NULL,
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in their channels"
  ON public.chat_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages m
      JOIN chat_channels c ON c.id = m.channel_id
      WHERE m.id = chat_attachments.message_id
        AND (
          public.has_role(auth.uid(), 'admin'::user_role)
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

CREATE INDEX idx_chat_attachments_message_id ON public.chat_attachments(message_id);


-- ---------------------------------------------------------------------------
-- 12. CHAT NOTIFICATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE public.chat_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  message_id      uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id      uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL,
  sender_name     text NOT NULL,
  message_preview text NOT NULL,
  read_at         timestamp with time zone,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.chat_notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON public.chat_notifications FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own notifications"
  ON public.chat_notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.chat_notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_notifications_user_id ON public.chat_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_unread  ON public.chat_notifications(user_id) WHERE read_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_notifications;


-- ---------------------------------------------------------------------------
-- 13. MESSAGE READ RECEIPTS
-- ---------------------------------------------------------------------------

CREATE TABLE public.message_read_receipts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  read_at    timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (message_id, user_id)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read receipts"    ON public.message_read_receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own read receipts"  ON public.message_read_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own read receipts"  ON public.message_read_receipts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own read receipts"  ON public.message_read_receipts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_read_receipts_user_channel ON public.message_read_receipts(user_id, channel_id);
CREATE INDEX idx_read_receipts_message       ON public.message_read_receipts(message_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;


-- ---------------------------------------------------------------------------
-- 14. NOTIFICATION PREFERENCES
-- ---------------------------------------------------------------------------

CREATE TABLE public.notification_preferences (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE,
  task_notifications    boolean NOT NULL DEFAULT true,
  mention_notifications boolean NOT NULL DEFAULT true,
  sound_enabled         boolean NOT NULL DEFAULT false,
  permission_status     text DEFAULT 'default',
  created_at            timestamp with time zone NOT NULL DEFAULT now(),
  updated_at            timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"   ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------------
-- 15. PERSONAL ACCESS TOKENS
-- ---------------------------------------------------------------------------

CREATE TABLE public.personal_access_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  token_hash   text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  last_used_at timestamp with time zone,
  expires_at   timestamp with time zone,
  revoked_at   timestamp with time zone,
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON public.personal_access_tokens FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can create own tokens"
  ON public.personal_access_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can revoke own tokens or admins any"
  ON public.personal_access_tokens FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete tokens"
  ON public.personal_access_tokens FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE INDEX idx_pat_token_hash ON public.personal_access_tokens(token_hash);
CREATE INDEX idx_pat_user_id    ON public.personal_access_tokens(user_id);

-- Safe view (excludes token_hash)
CREATE OR REPLACE VIEW public.personal_access_tokens_safe
WITH (security_invoker=on) AS
  SELECT id, user_id, name, token_prefix, created_at, expires_at, revoked_at, last_used_at
  FROM public.personal_access_tokens;


-- ---------------------------------------------------------------------------
-- 16. WEBHOOKS
-- ---------------------------------------------------------------------------

CREATE TABLE public.webhooks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  name           text NOT NULL,
  url            text NOT NULL,
  trigger_action text[] NOT NULL,
  enabled        boolean NOT NULL DEFAULT true,
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  updated_at     timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all webhooks"
  ON public.webhooks FOR SELECT USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Devs can view own webhooks"
  ON public.webhooks FOR SELECT
  USING (public.has_role(auth.uid(), 'dev'::user_role) AND auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
  ON public.webhooks FOR INSERT
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'dev'::user_role))
    AND auth.uid() = user_id
  );

CREATE POLICY "Users can update own webhooks or admins any"
  ON public.webhooks FOR UPDATE
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can delete own webhooks or admins any"
  ON public.webhooks FOR DELETE
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------------
-- 17. WEBHOOK LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE public.webhook_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      uuid REFERENCES public.webhooks(id) ON DELETE CASCADE,
  webhook_name    text NOT NULL,
  trigger_action  text NOT NULL,
  request_url     text NOT NULL,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status integer,
  response_body   text,
  error_message   text,
  success         boolean NOT NULL DEFAULT false,
  executed_at     timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Devs can view own webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'dev'::user_role)
    AND webhook_id IN (SELECT id FROM public.webhooks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert webhook logs"
  ON public.webhook_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_webhook_logs_webhook_id  ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_executed_at ON public.webhook_logs(executed_at DESC);


-- ---------------------------------------------------------------------------
-- 18. CUSTOMERS
-- ---------------------------------------------------------------------------

CREATE TABLE public.customers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  email              text UNIQUE NOT NULL,
  phone              text,
  company            text,
  created_at         timestamp with time zone NOT NULL DEFAULT now(),
  updated_at         timestamp with time zone NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES auth.users(id),
  total_leads_sent   integer NOT NULL DEFAULT 0,
  last_lead_sent_at  timestamp with time zone,
  human_mode_status  boolean NOT NULL DEFAULT false
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all customers"   ON public.customers FOR SELECT USING (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can insert customers"     ON public.customers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update customers"     ON public.customers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete customers"     ON public.customers FOR DELETE USING (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Ops can view all customers"      ON public.customers FOR SELECT USING (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can update customers"        ON public.customers FOR UPDATE USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE INDEX IF NOT EXISTS idx_customers_human_mode_status ON public.customers(human_mode_status);

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;


-- ---------------------------------------------------------------------------
-- 19. LEAD ASSIGNMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE public.lead_assignments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                  text NOT NULL,
  client_id                text NOT NULL,
  client_name              text,
  client_whatsapp          text NOT NULL,
  contact_info             text NOT NULL,
  post_url                 text NOT NULL,
  category                 text NOT NULL,
  requirement              text NOT NULL,
  website                  text,
  icp                      text,
  business_id              uuid NOT NULL,
  reassigned_business_id   uuid,
  reassigned_whatsapp      text,
  approval_status          text NOT NULL CHECK (approval_status IN ('approved','disapproved')),
  assigned_by              uuid NOT NULL,
  reassigned_by            uuid,
  reassignment_reason      text,
  reassigned_business_ids  jsonb DEFAULT '[]'::jsonb,
  created_at               timestamp with time zone NOT NULL DEFAULT now(),
  reassigned_at            timestamp with time zone
);

ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on lead_assignments"
  ON public.lead_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Ops can view and insert lead_assignments"
  ON public.lead_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Ops can insert lead_assignments"
  ON public.lead_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Ops can update lead_assignments"
  ON public.lead_assignments FOR UPDATE
  USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE INDEX idx_lead_assignments_lead_id        ON public.lead_assignments(lead_id);
CREATE INDEX idx_lead_assignments_business_id    ON public.lead_assignments(business_id);
CREATE INDEX idx_lead_assignments_approval_status ON public.lead_assignments(approval_status);


-- ---------------------------------------------------------------------------
-- 20. CRM: LEAD STAGES
-- ---------------------------------------------------------------------------

CREATE TABLE public.lead_stages (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  color      text NOT NULL,
  position   int4 NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Ops can select lead_stages" ON public.lead_stages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can insert lead_stages" ON public.lead_stages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can update lead_stages" ON public.lead_stages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can delete lead_stages" ON public.lead_stages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));

CREATE TRIGGER update_lead_stages_updated_at
  BEFORE UPDATE ON public.lead_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_stages;

INSERT INTO public.lead_stages (id, name, color, position) VALUES
  ('new-lead',       'New Lead',       '#28a745', 1),
  ('contacted',      'Contacted',      '#007BFF', 2),
  ('qualified',      'Qualified',      '#6f42c1', 3),
  ('proposal-sent',  'Proposal Sent',  '#fd7e14', 4),
  ('negotiation',    'Negotiation',    '#ffc107', 5),
  ('closed-won',     'Closed Won',     '#20c997', 6),
  ('closed-lost',    'Closed Lost',    '#dc3545', 7);


-- ---------------------------------------------------------------------------
-- 21. CRM: LEADS (renamed from "leads" → "crm_leads" to avoid conflict)
-- ---------------------------------------------------------------------------

CREATE SEQUENCE public.crm_leads_id_seq START WITH 1;

CREATE TABLE public.crm_leads (
  id          bigint PRIMARY KEY DEFAULT nextval('public.crm_leads_id_seq'),
  name        text NOT NULL,
  profile_url text,
  whatsapp    text,
  website     text,
  stage_id    text REFERENCES public.lead_stages(id),
  created_by  text DEFAULT '6a58a5d2-8287-4829-a333-e56a5e7e93ee',
  updated_by  text DEFAULT '6a58a5d2-8287-4829-a333-e56a5e7e93ee',
  source      text,
  value       numeric DEFAULT 0,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Ops can select crm_leads" ON public.crm_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can insert crm_leads" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can update crm_leads" ON public.crm_leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin can delete crm_leads"         ON public.crm_leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;


-- ---------------------------------------------------------------------------
-- 22. CRM: LEAD SOURCES
-- ---------------------------------------------------------------------------

CREATE TABLE public.lead_sources (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  icon      text,
  is_active boolean NOT NULL DEFAULT true,
  position  integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Ops can select lead_sources" ON public.lead_sources FOR SELECT USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can insert lead_sources" ON public.lead_sources FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can update lead_sources" ON public.lead_sources FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can delete lead_sources" ON public.lead_sources FOR DELETE USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_sources;

INSERT INTO public.lead_sources (id, name, position) VALUES
  ('reddit',   'Reddit',       1),
  ('twitter',  'X (Twitter)',  2),
  ('facebook', 'Facebook',     3),
  ('whatsapp', 'WhatsApp',     4);


-- ---------------------------------------------------------------------------
-- 23. CRM: WEBHOOKS + WEBHOOK EVENTS
-- ---------------------------------------------------------------------------

CREATE TABLE public.crm_webhooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  url        text NOT NULL,
  events     text[] NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  secret     text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on crm_webhooks"
  ON public.crm_webhooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Ops can view crm_webhooks"
  ON public.crm_webhooks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE TABLE public.crm_webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_id      uuid REFERENCES public.crm_webhooks(id) ON DELETE SET NULL,
  webhook_name    text,
  request_url     text,
  response_status integer,
  response_body   text,
  error_message   text,
  success         boolean NOT NULL DEFAULT false,
  retry_count     integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending',
  executed_at     timestamptz NOT NULL DEFAULT now(),
  created_by      uuid
);

ALTER TABLE public.crm_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can select crm_webhook_events" ON public.crm_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admin can insert crm_webhook_events" ON public.crm_webhook_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Ops can view crm_webhook_events"     ON public.crm_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ops'::user_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_webhooks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_webhook_events;

-- Trigger: fire webhook events on crm_leads changes
CREATE OR REPLACE FUNCTION public.notify_crm_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_payload    jsonb;
  v_webhook    record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'lead.created';
    v_payload := jsonb_build_object('lead', row_to_json(NEW), 'event', v_event_type);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      v_event_type := 'lead.stage_changed';
      v_payload := jsonb_build_object(
        'lead_id', NEW.id, 'old_stage', OLD.stage_id, 'new_stage', NEW.stage_id,
        'lead', row_to_json(NEW), 'event', v_event_type
      );
    ELSE
      v_event_type := 'lead.updated';
      v_payload := jsonb_build_object('lead', row_to_json(NEW), 'event', v_event_type);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'lead.deleted';
    v_payload := jsonb_build_object('lead_id', OLD.id, 'lead', row_to_json(OLD), 'event', v_event_type, 'deleted_at', now());
    FOR v_webhook IN
      SELECT id, name, url FROM public.crm_webhooks WHERE active = true AND v_event_type = ANY(events)
    LOOP
      INSERT INTO public.crm_webhook_events (event_type, payload, webhook_id, webhook_name, request_url, status)
      VALUES (v_event_type, v_payload, v_webhook.id, v_webhook.name, v_webhook.url, 'pending');
    END LOOP;
    RETURN OLD;
  END IF;

  FOR v_webhook IN
    SELECT id, name, url FROM public.crm_webhooks WHERE active = true AND v_event_type = ANY(events)
  LOOP
    INSERT INTO public.crm_webhook_events (event_type, payload, webhook_id, webhook_name, request_url, status)
    VALUES (v_event_type, v_payload, v_webhook.id, v_webhook.name, v_webhook.url, 'pending');
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_lead_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_crm_webhook();


-- ---------------------------------------------------------------------------
-- 24. CRM: FOLLOW-UPS
-- ---------------------------------------------------------------------------

CREATE TABLE public.crm_follow_ups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      bigint NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  title        text NOT NULL,
  notes        text,
  scheduled_at timestamptz NOT NULL,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on crm_follow_ups"
  ON public.crm_follow_ups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Ops can select crm_follow_ups" ON public.crm_follow_ups FOR SELECT USING (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can insert crm_follow_ups" ON public.crm_follow_ups FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can update crm_follow_ups" ON public.crm_follow_ups FOR UPDATE USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE TRIGGER update_crm_follow_ups_updated_at
  BEFORE UPDATE ON public.crm_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_follow_ups;

-- Trigger: fire webhook events on crm_follow_ups changes
CREATE OR REPLACE FUNCTION public.notify_crm_followup_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_type text;
  v_payload    jsonb;
  v_webhook    record;
  v_lead       record;
BEGIN
  SELECT * INTO v_lead FROM public.crm_leads WHERE id = NEW.lead_id;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'fu.created';
    v_payload := jsonb_build_object(
      'event', v_event_type,
      'follow_up', row_to_json(NEW),
      'lead_id', NEW.lead_id,
      'lead', CASE WHEN v_lead IS NOT NULL THEN row_to_json(v_lead)::jsonb ELSE NULL END
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.completed = false AND NEW.completed = true THEN
      v_event_type := 'fu.completed';
      v_payload := jsonb_build_object(
        'event', v_event_type,
        'follow_up', row_to_json(NEW),
        'lead_id', NEW.lead_id,
        'lead', CASE WHEN v_lead IS NOT NULL THEN row_to_json(v_lead)::jsonb ELSE NULL END
      );
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  FOR v_webhook IN
    SELECT id, name, url FROM public.crm_webhooks WHERE active = true AND v_event_type = ANY(events)
  LOOP
    INSERT INTO public.crm_webhook_events (event_type, payload, webhook_id, webhook_name, request_url, status)
    VALUES (v_event_type, v_payload, v_webhook.id, v_webhook.name, v_webhook.url, 'pending');
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER crm_followup_webhook_trigger
  AFTER INSERT OR UPDATE ON public.crm_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.notify_crm_followup_webhook();


-- ---------------------------------------------------------------------------
-- 25. OUTREACH ENTRIES
-- ---------------------------------------------------------------------------

CREATE TABLE public.outreach_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date NOT NULL,
  platform     text NOT NULL CHECK (platform IN ('reddit','linkedin','X')),
  link         text NOT NULL,
  comment      text NOT NULL,
  notes        text,
  completed    boolean DEFAULT false,
  completed_by uuid,
  completed_at timestamp with time zone,
  created_at   timestamp with time zone DEFAULT now()
);

ALTER TABLE public.outreach_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Ops can view entries"   ON public.outreach_entries FOR SELECT USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin and Ops can update entries" ON public.outreach_entries FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Admin can delete entries"         ON public.outreach_entries FOR DELETE USING (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Authenticated can insert entries" ON public.outreach_entries FOR INSERT WITH CHECK (true);

CREATE INDEX idx_outreach_platform    ON public.outreach_entries(platform);
CREATE INDEX idx_outreach_date        ON public.outreach_entries(date);
CREATE INDEX idx_outreach_completed_by ON public.outreach_entries(completed_by);
CREATE INDEX idx_outreach_completed_at ON public.outreach_entries(completed_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_entries;


-- ---------------------------------------------------------------------------
-- 26. OUTREACH FOLLOW-UP TABLES (Day 2 / Day 5 / Day 7 / Dynamic)
-- ---------------------------------------------------------------------------

CREATE TABLE public.outreach_fu_day_2 (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  proof      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done       boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_fu_day_5 (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  proof      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done       boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_fu_day_7 (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  proof      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done       boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_fu_dynamic (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  proof      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done       boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_fu_day_2   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_fu_day_5   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_fu_day_7   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_fu_dynamic ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin full access on outreach_fu_day_2"   ON public.outreach_fu_day_2   FOR ALL USING (public.has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Ops can select outreach_fu_day_2"         ON public.outreach_fu_day_2   FOR SELECT USING (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can insert outreach_fu_day_2"         ON public.outreach_fu_day_2   FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can update outreach_fu_day_2"         ON public.outreach_fu_day_2   FOR UPDATE USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin full access on outreach_fu_day_5"   ON public.outreach_fu_day_5   FOR ALL USING (public.has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Ops can select outreach_fu_day_5"         ON public.outreach_fu_day_5   FOR SELECT USING (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can insert outreach_fu_day_5"         ON public.outreach_fu_day_5   FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can update outreach_fu_day_5"         ON public.outreach_fu_day_5   FOR UPDATE USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin full access on outreach_fu_day_7"   ON public.outreach_fu_day_7   FOR ALL USING (public.has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Ops can select outreach_fu_day_7"         ON public.outreach_fu_day_7   FOR SELECT USING (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can insert outreach_fu_day_7"         ON public.outreach_fu_day_7   FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can update outreach_fu_day_7"         ON public.outreach_fu_day_7   FOR UPDATE USING (public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin full access on outreach_fu_dynamic" ON public.outreach_fu_dynamic FOR ALL USING (public.has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Ops can select outreach_fu_dynamic"       ON public.outreach_fu_dynamic FOR SELECT USING (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can insert outreach_fu_dynamic"       ON public.outreach_fu_dynamic FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ops'::user_role));
CREATE POLICY "Ops can update outreach_fu_dynamic"       ON public.outreach_fu_dynamic FOR UPDATE USING (public.has_role(auth.uid(), 'ops'::user_role));

-- updated_at triggers
CREATE TRIGGER update_outreach_fu_day_2_updated_at   BEFORE UPDATE ON public.outreach_fu_day_2   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_fu_day_5_updated_at   BEFORE UPDATE ON public.outreach_fu_day_5   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_fu_day_7_updated_at   BEFORE UPDATE ON public.outreach_fu_day_7   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_fu_dynamic_updated_at BEFORE UPDATE ON public.outreach_fu_dynamic FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_5;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_7;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_dynamic;

-- Webhook trigger function (fires on INSERT → logs to webhook_logs)
CREATE OR REPLACE FUNCTION public.notify_outreach_fu_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trigger_name text;
  v_payload      jsonb;
  v_webhook      record;
BEGIN
  v_trigger_name := TG_TABLE_NAME;
  v_payload := jsonb_build_object(
    'trigger',   v_trigger_name,
    'data',      row_to_json(NEW)::jsonb,
    'timestamp', now()
  );
  FOR v_webhook IN
    SELECT id, name, url FROM public.webhooks WHERE enabled = true AND v_trigger_name = ANY(trigger_action)
  LOOP
    INSERT INTO public.webhook_logs (webhook_id, webhook_name, trigger_action, request_url, request_payload, success)
    VALUES (v_webhook.id, v_webhook.name, v_trigger_name, v_webhook.url, v_payload, false);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_outreach_fu_day_2_webhook   AFTER INSERT ON public.outreach_fu_day_2   FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
CREATE TRIGGER notify_outreach_fu_day_5_webhook   AFTER INSERT ON public.outreach_fu_day_5   FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
CREATE TRIGGER notify_outreach_fu_day_7_webhook   AFTER INSERT ON public.outreach_fu_day_7   FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
CREATE TRIGGER notify_outreach_fu_dynamic_webhook AFTER INSERT ON public.outreach_fu_dynamic FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();

-- Bell notification function (sends chat_notifications to all ops/admin on INSERT)
CREATE OR REPLACE FUNCTION public.notify_outreach_fu_bell()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_label          text;
  v_preview        text;
  v_target_user_id uuid;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'outreach_fu_day_2'   THEN v_label := 'Day 2';
    WHEN 'outreach_fu_day_5'   THEN v_label := 'Day 5';
    WHEN 'outreach_fu_day_7'   THEN v_label := 'Day 7';
    WHEN 'outreach_fu_dynamic' THEN v_label := 'Dynamic';
    ELSE v_label := TG_TABLE_NAME;
  END CASE;

  v_preview := 'New entry (' || v_label || '): "' || LEFT(NEW.name, 100) || '"';

  FOR v_target_user_id IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('ops','admin')
  LOOP
    INSERT INTO public.chat_notifications (user_id, sender_id, sender_name, message_preview)
    VALUES (v_target_user_id, v_target_user_id, 'Outreach FU', v_preview);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_outreach_fu_day_2_bell   AFTER INSERT ON public.outreach_fu_day_2   FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();
CREATE TRIGGER trg_outreach_fu_day_5_bell   AFTER INSERT ON public.outreach_fu_day_5   FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();
CREATE TRIGGER trg_outreach_fu_day_7_bell   AFTER INSERT ON public.outreach_fu_day_7   FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();
CREATE TRIGGER trg_outreach_fu_dynamic_bell AFTER INSERT ON public.outreach_fu_dynamic FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();


-- ---------------------------------------------------------------------------
-- 27. SUBREDDIT WATCH
-- ---------------------------------------------------------------------------

CREATE TABLE public.subreddit_watch (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  subreddit       text,
  count           text,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subreddit_watch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Ops can view subreddit_watch"
  ON public.subreddit_watch FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin and Ops can insert subreddit_watch"
  ON public.subreddit_watch FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin and Ops can update subreddit_watch"
  ON public.subreddit_watch FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin and Ops can delete subreddit_watch"
  ON public.subreddit_watch FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Allow anon inserts"
  ON public.subreddit_watch FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated can insert subreddit_watch"
  ON public.subreddit_watch FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.subreddit_watch;
