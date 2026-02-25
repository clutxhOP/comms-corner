
-- SECURITY DEFINER function to insert bell notifications for all ops/admin users
CREATE OR REPLACE FUNCTION public.notify_outreach_fu_bell()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_label text;
  v_preview text;
  v_target_user_id uuid;
BEGIN
  -- Derive label from table name
  CASE TG_TABLE_NAME
    WHEN 'outreach_fu_day_2' THEN v_label := 'Day 2';
    WHEN 'outreach_fu_day_5' THEN v_label := 'Day 5';
    WHEN 'outreach_fu_day_7' THEN v_label := 'Day 7';
    WHEN 'outreach_fu_dynamic' THEN v_label := 'Dynamic';
    ELSE v_label := TG_TABLE_NAME;
  END CASE;

  v_preview := 'New entry (' || v_label || '): "' || LEFT(NEW.name, 100) || '"';

  -- Insert a notification for every ops or admin user
  FOR v_target_user_id IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('ops', 'admin')
  LOOP
    INSERT INTO public.chat_notifications (user_id, sender_id, sender_name, message_preview)
    VALUES (v_target_user_id, v_target_user_id, 'Outreach FU', v_preview);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Triggers on all 4 outreach_fu tables
CREATE TRIGGER trg_outreach_fu_day_2_bell
  AFTER INSERT ON public.outreach_fu_day_2
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();

CREATE TRIGGER trg_outreach_fu_day_5_bell
  AFTER INSERT ON public.outreach_fu_day_5
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();

CREATE TRIGGER trg_outreach_fu_day_7_bell
  AFTER INSERT ON public.outreach_fu_day_7
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();

CREATE TRIGGER trg_outreach_fu_dynamic_bell
  AFTER INSERT ON public.outreach_fu_dynamic
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_bell();
