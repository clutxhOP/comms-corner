

# Add OPS Dashboard Notifications for Outreach FU Entries

## Problem
When new data is added to outreach FU tables, no in-app notification appears on the OPS dashboard. The edge functions send email notifications via `send-task-notifications`, but there are no browser/in-app notifications, and the database webhook triggers are not attached.

## Root Cause
1. **Missing database triggers**: The function `notify_outreach_fu_webhook` exists but no triggers are bound to the outreach FU tables (`outreach_fu_day_2`, `outreach_fu_day_5`, `outreach_fu_day_7`, `outreach_fu_dynamic`), so webhooks never fire on INSERT.
2. **No realtime browser notifications**: `useRealtimeNotifications` only subscribes to the `tasks` table. There is no subscription for outreach FU tables, so OPS users never see browser push notifications for new entries.

## Plan

### Step 1: Database Migration -- Create Triggers
Create triggers on all four outreach FU tables to fire `notify_outreach_fu_webhook` on INSERT:

```sql
CREATE TRIGGER trg_outreach_fu_day_2_webhook
  AFTER INSERT ON public.outreach_fu_day_2
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();

CREATE TRIGGER trg_outreach_fu_day_5_webhook
  AFTER INSERT ON public.outreach_fu_day_5
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();

CREATE TRIGGER trg_outreach_fu_day_7_webhook
  AFTER INSERT ON public.outreach_fu_day_7
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();

CREATE TRIGGER trg_outreach_fu_dynamic_webhook
  AFTER INSERT ON public.outreach_fu_dynamic
  FOR EACH ROW EXECUTE FUNCTION public.notify_outreach_fu_webhook();
```

Also enable realtime for these tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_5;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_day_7;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_fu_dynamic;
```

### Step 2: Add Realtime Browser Notifications
Update `src/hooks/useRealtimeNotifications.tsx` to subscribe to INSERT events on all four outreach FU tables. When a new entry arrives, call `showNotification()` with a title like "New Outreach FU (Day 2)" and body containing the entry name, so OPS users see a browser push notification immediately.

### Step 3: Also create CRM triggers (while at it)
The `notify_crm_webhook` and `notify_crm_followup_webhook` functions also have no triggers attached. Create them:

```sql
CREATE TRIGGER trg_leads_crm_webhook
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_crm_webhook();

CREATE TRIGGER trg_crm_follow_ups_webhook
  AFTER INSERT OR UPDATE ON public.crm_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.notify_crm_followup_webhook();
```

### Files Changed
- **Migration SQL** -- triggers + realtime publication
- `src/hooks/useRealtimeNotifications.tsx` -- add outreach FU table subscriptions with browser notifications for OPS users

