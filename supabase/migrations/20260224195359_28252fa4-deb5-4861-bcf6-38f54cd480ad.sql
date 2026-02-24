
-- Phase 1: crm_follow_ups table
CREATE TABLE public.crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  scheduled_at timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on crm_follow_ups"
  ON public.crm_follow_ups FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Ops can select crm_follow_ups"
  ON public.crm_follow_ups FOR SELECT
  USING (has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Ops can insert crm_follow_ups"
  ON public.crm_follow_ups FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Ops can update crm_follow_ups"
  ON public.crm_follow_ups FOR UPDATE
  USING (has_role(auth.uid(), 'ops'::user_role));

-- Trigger function for webhook events
CREATE OR REPLACE FUNCTION public.notify_crm_followup_webhook()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_event_type text;
  v_payload jsonb;
  v_webhook record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'fu.created';
    v_payload := jsonb_build_object(
      'event', v_event_type,
      'follow_up', row_to_json(NEW),
      'lead_id', NEW.lead_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.completed = false AND NEW.completed = true THEN
      v_event_type := 'fu.completed';
      v_payload := jsonb_build_object(
        'event', v_event_type,
        'follow_up', row_to_json(NEW),
        'lead_id', NEW.lead_id
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
$$;

-- Trigger
CREATE TRIGGER crm_followup_webhook_trigger
  AFTER INSERT OR UPDATE ON public.crm_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.notify_crm_followup_webhook();

-- Updated_at trigger
CREATE TRIGGER update_crm_follow_ups_updated_at
  BEFORE UPDATE ON public.crm_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_follow_ups;
