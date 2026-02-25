
-- 1. Create 4 identical tables
CREATE TABLE public.outreach_fu_day_2 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  proof text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_fu_day_5 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  proof text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_fu_day_7 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  proof text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_fu_dynamic (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  proof text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS on all 4 tables
ALTER TABLE public.outreach_fu_day_2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_fu_day_5 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_fu_day_7 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_fu_dynamic ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies: Admin full access, Ops SELECT/INSERT/UPDATE
-- outreach_fu_day_2
CREATE POLICY "Admin full access on outreach_fu_day_2" ON public.outreach_fu_day_2 FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Ops can select outreach_fu_day_2" ON public.outreach_fu_day_2 FOR SELECT USING (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can insert outreach_fu_day_2" ON public.outreach_fu_day_2 FOR INSERT WITH CHECK (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can update outreach_fu_day_2" ON public.outreach_fu_day_2 FOR UPDATE USING (has_role(auth.uid(), 'ops'));

-- outreach_fu_day_5
CREATE POLICY "Admin full access on outreach_fu_day_5" ON public.outreach_fu_day_5 FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Ops can select outreach_fu_day_5" ON public.outreach_fu_day_5 FOR SELECT USING (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can insert outreach_fu_day_5" ON public.outreach_fu_day_5 FOR INSERT WITH CHECK (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can update outreach_fu_day_5" ON public.outreach_fu_day_5 FOR UPDATE USING (has_role(auth.uid(), 'ops'));

-- outreach_fu_day_7
CREATE POLICY "Admin full access on outreach_fu_day_7" ON public.outreach_fu_day_7 FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Ops can select outreach_fu_day_7" ON public.outreach_fu_day_7 FOR SELECT USING (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can insert outreach_fu_day_7" ON public.outreach_fu_day_7 FOR INSERT WITH CHECK (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can update outreach_fu_day_7" ON public.outreach_fu_day_7 FOR UPDATE USING (has_role(auth.uid(), 'ops'));

-- outreach_fu_dynamic
CREATE POLICY "Admin full access on outreach_fu_dynamic" ON public.outreach_fu_dynamic FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Ops can select outreach_fu_dynamic" ON public.outreach_fu_dynamic FOR SELECT USING (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can insert outreach_fu_dynamic" ON public.outreach_fu_dynamic FOR INSERT WITH CHECK (has_role(auth.uid(), 'ops'));
CREATE POLICY "Ops can update outreach_fu_dynamic" ON public.outreach_fu_dynamic FOR UPDATE USING (has_role(auth.uid(), 'ops'));

-- 4. updated_at triggers
CREATE TRIGGER update_outreach_fu_day_2_updated_at BEFORE UPDATE ON public.outreach_fu_day_2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_fu_day_5_updated_at BEFORE UPDATE ON public.outreach_fu_day_5 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_fu_day_7_updated_at BEFORE UPDATE ON public.outreach_fu_day_7 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_fu_dynamic_updated_at BEFORE UPDATE ON public.outreach_fu_dynamic FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_5;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_7;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_dynamic;

-- 6. Webhook trigger function
CREATE OR REPLACE FUNCTION public.notify_outreach_fu_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trigger_name text;
  v_payload jsonb;
  v_webhook record;
BEGIN
  v_trigger_name := TG_TABLE_NAME;

  v_payload := jsonb_build_object(
    'trigger', v_trigger_name,
    'data', row_to_json(NEW)::jsonb,
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

-- 7. Attach webhook triggers on INSERT
CREATE TRIGGER notify_outreach_fu_day_2_webhook AFTER INSERT ON public.outreach_fu_day_2 FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
CREATE TRIGGER notify_outreach_fu_day_5_webhook AFTER INSERT ON public.outreach_fu_day_5 FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
CREATE TRIGGER notify_outreach_fu_day_7_webhook AFTER INSERT ON public.outreach_fu_day_7 FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
CREATE TRIGGER notify_outreach_fu_dynamic_webhook AFTER INSERT ON public.outreach_fu_dynamic FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
