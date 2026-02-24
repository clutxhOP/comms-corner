

# CRM Follow-Ups System

## Overview
Add a follow-up scheduling system tied to leads. When a lead moves to the "contacted" stage (or any stage), follow-ups can be created, completed, and tracked -- with webhook events firing automatically. This is entirely additive.

---

## Phase 1: Database Migration

### New Table: `crm_follow_ups`
Tracks scheduled follow-up tasks for leads.

```text
id: uuid (PK, gen_random_uuid())
lead_id: bigint NOT NULL (references leads.id ON DELETE CASCADE)
title: text NOT NULL
notes: text
scheduled_at: timestamptz NOT NULL
completed: boolean DEFAULT false
completed_at: timestamptz
completed_by: uuid
created_by: uuid NOT NULL
created_at: timestamptz DEFAULT now()
updated_at: timestamptz DEFAULT now()
```

**RLS Policies:**
- Admin: full CRUD
- Ops: SELECT, INSERT, UPDATE

### New Postgres Trigger Function: `notify_crm_followup_webhook()`
Fires AFTER INSERT, UPDATE on `crm_follow_ups`:
- INSERT --> `fu.created` event with full follow-up + lead_id in payload
- UPDATE where `completed` changes from false to true --> `fu.completed` event with follow-up data
- Inserts rows into existing `crm_webhook_events` for each matching active `crm_webhooks` entry

### New Trigger on `crm_follow_ups`
```text
crm_followup_webhook_trigger AFTER INSERT OR UPDATE ON crm_follow_ups
```

### Add New Event Types to CRM Webhook Events Constant
Add 3 new selectable events in the webhook creation form:
- `fu.created` -- Follow-Up Created
- `fu.completed` -- Follow-Up Completed
- `fu.overdue` -- Follow-Up Overdue (for future cron use)

### Enable Realtime
```text
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_follow_ups;
```

---

## Phase 2: New Edge Function for Follow-Ups

### New File: `supabase/functions/manage-crm-followups/index.ts`
REST-style edge function with 3 endpoints:

1. **POST** (create follow-up): Accepts `{ lead_id, title, notes?, scheduled_at }`, inserts into `crm_follow_ups`
2. **PATCH** (complete follow-up): Accepts `{ id }`, marks `completed = true`, sets `completed_at` and `completed_by`
3. **GET** (list follow-ups): Returns follow-ups, optionally filtered by `lead_id` query param

Auth: Validates JWT, checks admin/ops role. Uses service role client for writes.

---

## Phase 3: New React Hook

### New File: `src/hooks/useCrmFollowUps.tsx`
- Fetches from `crm_follow_ups` table with optional `lead_id` filter
- CRUD: `createFollowUp`, `completeFollowUp`, `deleteFollowUp`
- Realtime subscription on `crm_follow_ups`
- Computed `overdueFollowUps` list (where `scheduled_at < now()` and not completed)

---

## Phase 4: UI Components

### New File: `src/components/crm/FollowUpManager.tsx`
A card/section shown inside the CRM Integrations tab (below webhooks) with:
- **Upcoming Follow-Ups Table**: Lead name, title, scheduled date, status badge (upcoming/overdue/completed), Complete button
- **Add Follow-Up Dialog**: Lead selector, title, notes, date picker
- Overdue items highlighted in red
- Filter by lead

### Modified File: `src/components/crm/CrmWebhookManager.tsx` (additive only)
- Import and render `<FollowUpManager />` below the existing webhook cards
- No existing components removed

### Modified File: `src/hooks/useCrmWebhooks.tsx` (additive only)
- Add 3 new entries to `CRM_WEBHOOK_EVENTS` constant array:
  - `{ value: 'fu.created', label: 'Follow-Up Created' }`
  - `{ value: 'fu.completed', label: 'Follow-Up Completed' }`
  - `{ value: 'fu.overdue', label: 'Follow-Up Overdue' }`

### Modified File: `src/components/crm/CrmWebhookForm.tsx`
- No changes needed -- it already reads from `CRM_WEBHOOK_EVENTS`, so new events appear automatically

---

## Phase 5: API Docs Update

### Modified File: `src/pages/admin/ApiDocs.tsx` (additive only)
Add a "CRM Follow-Ups" section documenting:
- `POST /functions/v1/manage-crm-followups` -- create follow-up
- `PATCH /functions/v1/manage-crm-followups` -- complete follow-up
- `GET /functions/v1/manage-crm-followups?lead_id=123` -- list follow-ups
- Follow-up webhook event payload examples

---

## Files Summary

### New Files Created
1. Database migration -- `crm_follow_ups` table, RLS, trigger function, trigger
2. `supabase/functions/manage-crm-followups/index.ts` -- REST edge function
3. `src/hooks/useCrmFollowUps.tsx` -- React hook for follow-ups CRUD
4. `src/components/crm/FollowUpManager.tsx` -- Follow-ups UI

### Modified Files (additive only)
1. `src/hooks/useCrmWebhooks.tsx` -- add 3 new event types to `CRM_WEBHOOK_EVENTS` constant
2. `src/components/crm/CrmWebhookManager.tsx` -- render `<FollowUpManager />` below existing content
3. `src/pages/admin/ApiDocs.tsx` -- add follow-ups endpoints documentation
4. `supabase/config.toml` -- add `manage-crm-followups` function config

### Existing Structures NOT Touched
- `crm_webhooks` table -- unchanged
- `crm_webhook_events` table -- unchanged (reused for fu.* events)
- `notify_crm_webhook()` function -- unchanged
- `deliver-crm-webhooks` edge function -- unchanged (already delivers any event type)
- `leads` table -- unchanged
- All existing webhooks, hooks, components -- unchanged

### Integration Flow
1. Lead moves to "contacted" stage --> existing `lead.stage_changed` webhook fires
2. User creates follow-up for that lead --> `fu.created` event queued in `crm_webhook_events`
3. User completes follow-up --> `fu.completed` event queued
4. `deliver-crm-webhooks` edge function picks up and delivers all pending events (no changes needed)

### Permissions
- `crm_follow_ups`: Admin full CRUD, Ops can SELECT/INSERT/UPDATE
- Edge function validates JWT and role before operations
- Webhook trigger uses SECURITY DEFINER to insert into `crm_webhook_events`

