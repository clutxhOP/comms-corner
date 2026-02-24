
-- New table: crm_webhooks
CREATE TABLE public.crm_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL,
  active boolean NOT NULL DEFAULT true,
  secret text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_webhooks ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admin full access on crm_webhooks" ON public.crm_webhooks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- Ops SELECT only
CREATE POLICY "Ops can view crm_webhooks" ON public.crm_webhooks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ops'::user_role));

-- New table: crm_webhook_events
CREATE TABLE public.crm_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_id uuid REFERENCES public.crm_webhooks(id) ON DELETE SET NULL,
  webhook_name text,
  request_url text,
  response_status integer,
  response_body text,
  error_message text,
  success boolean NOT NULL DEFAULT false,
  retry_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.crm_webhook_events ENABLE ROW LEVEL SECURITY;

-- Admin SELECT + INSERT
CREATE POLICY "Admin can select crm_webhook_events" ON public.crm_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admin can insert crm_webhook_events" ON public.crm_webhook_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- Ops SELECT only
CREATE POLICY "Ops can view crm_webhook_events" ON public.crm_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ops'::user_role));

-- Trigger function: notify_crm_webhook
CREATE OR REPLACE FUNCTION public.notify_crm_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_payload jsonb;
  v_webhook record;
BEGIN
  -- Determine event type and payload
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'lead.created';
    v_payload := jsonb_build_object('lead', row_to_json(NEW), 'event', v_event_type);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      v_event_type := 'lead.stage_changed';
      v_payload := jsonb_build_object(
        'lead_id', NEW.id,
        'old_stage', OLD.stage_id,
        'new_stage', NEW.stage_id,
        'lead', row_to_json(NEW),
        'event', v_event_type
      );
    ELSE
      v_event_type := 'lead.updated';
      v_payload := jsonb_build_object('lead', row_to_json(NEW), 'event', v_event_type);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'lead.deleted';
    v_payload := jsonb_build_object('lead_id', OLD.id, 'lead', row_to_json(OLD), 'event', v_event_type, 'deleted_at', now());
    -- Insert events for DELETE and return OLD
    FOR v_webhook IN
      SELECT id, name, url FROM public.crm_webhooks WHERE active = true AND v_event_type = ANY(events)
    LOOP
      INSERT INTO public.crm_webhook_events (event_type, payload, webhook_id, webhook_name, request_url, status)
      VALUES (v_event_type, v_payload, v_webhook.id, v_webhook.name, v_webhook.url, 'pending');
    END LOOP;
    RETURN OLD;
  END IF;

  -- Insert pending events for each matching active webhook
  FOR v_webhook IN
    SELECT id, name, url FROM public.crm_webhooks WHERE active = true AND v_event_type = ANY(events)
  LOOP
    INSERT INTO public.crm_webhook_events (event_type, payload, webhook_id, webhook_name, request_url, status)
    VALUES (v_event_type, v_payload, v_webhook.id, v_webhook.name, v_webhook.url, 'pending');
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger to leads table (additive, does not affect existing triggers)
CREATE TRIGGER crm_lead_webhook_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_crm_webhook();

-- Enable realtime for both new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_webhooks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_webhook_events;
