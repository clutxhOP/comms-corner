CREATE OR REPLACE FUNCTION public.notify_crm_followup_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_type text;
  v_payload jsonb;
  v_webhook record;
  v_lead record;
BEGIN
  -- Fetch the associated lead
  SELECT * INTO v_lead FROM public.leads WHERE id = NEW.lead_id;

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