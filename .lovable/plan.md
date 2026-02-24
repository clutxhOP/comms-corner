

# CRM Webhooks and Event System

## Overview
Add a dedicated CRM webhook system that fires events on lead changes (create, update, stage change, delete). This is entirely additive -- no existing webhooks, endpoints, functions, or table structures will be modified or deleted.

---

## Phase 1: Database Migration

### New Table: `crm_webhooks`
Stores CRM-specific webhook registrations, completely separate from the existing `webhooks` table.

```text
id: uuid (PK, gen_random_uuid())
name: text NOT NULL
url: text NOT NULL
events: text[] NOT NULL
active: boolean DEFAULT true
secret: text (HMAC signing secret)
created_by: uuid NOT NULL
created_at: timestamptz DEFAULT now()
updated_at: timestamptz DEFAULT now()
```

**RLS Policies:**
- Admin: full CRUD
- Ops: SELECT only

### New Table: `crm_webhook_events`
Audit log for all CRM webhook deliveries.

```text
id: uuid (PK, gen_random_uuid())
event_type: text NOT NULL
payload: jsonb NOT NULL
webhook_id: uuid (references crm_webhooks.id ON DELETE SET NULL)
webhook_name: text
request_url: text
response_status: integer
response_body: text
error_message: text
success: boolean DEFAULT false
retry_count: integer DEFAULT 0
status: text DEFAULT 'pending'
executed_at: timestamptz DEFAULT now()
created_by: uuid
```

**RLS Policies:**
- Admin: SELECT, INSERT
- Ops: SELECT only

### New Postgres Trigger Function: `notify_crm_webhook()`
Fires AFTER INSERT, UPDATE, DELETE on `leads` table. Determines event type:
- INSERT --> `lead.created`
- UPDATE with `stage_id` change --> `lead.stage_changed` (includes old_stage, new_stage)
- UPDATE (other fields) --> `lead.updated`
- DELETE --> `lead.deleted`

Inserts a row into `crm_webhook_events` for each matching active `crm_webhooks` entry with `status = 'pending'`.

### New Trigger on `leads` table
```text
crm_lead_webhook_trigger AFTER INSERT OR UPDATE OR DELETE
```
This is additive -- does NOT interfere with existing realtime subscription on leads.

### Enable Realtime
Both new tables added to `supabase_realtime` publication.

---

## Phase 2: Delivery Edge Function

### New File: `supabase/functions/deliver-crm-webhooks/index.ts`
- Scans `crm_webhook_events` where `status = 'pending'`
- For each event, POSTs to the webhook URL with HMAC-SHA256 signature
- Standard payload format:
```text
{
  "event": "lead.stage_changed",
  "timestamp": "2026-02-24T20:27:00Z",
  "data": { ... },
  "signature": "sha256=..."
}
```
- Updates `status` to `sent` or `failed`
- Records `response_status`, `response_body`, `error_message`
- Retry logic: up to 3 retries (increments `retry_count`)
- Uses service role key (internal invocation only)
- CORS headers included
- JWT verification disabled in config.toml

---

## Phase 3: New React Hook

### New File: `src/hooks/useCrmWebhooks.tsx`
- Fetches from `crm_webhooks` and `crm_webhook_events` tables
- CRUD operations: `createCrmWebhook`, `updateCrmWebhook`, `deleteCrmWebhook`
- `testCrmWebhook(id)` -- inserts a sample `lead.created` event
- Realtime subscriptions on both tables
- Exports `CRM_WEBHOOK_EVENTS` constant array

---

## Phase 4: UI Components

### New File: `src/components/crm/CrmWebhookForm.tsx`
Dialog form for creating a new CRM webhook:
- Name input
- URL input
- Secret input (auto-generate option)
- Events multi-select checkboxes

### New File: `src/components/crm/CrmWebhookManager.tsx`
Full management UI with three sections:
1. **Add Webhook** button (opens CrmWebhookForm dialog)
2. **Active Webhooks Table**: Name, URL, Events (badges), Active toggle, Test button, Delete button
3. **Recent Events Log**: Collapsible list with event_type, status badge, timestamp, expandable payload/response

Permissions enforced: Admin can create/delete/toggle. Ops can view only.

---

## Phase 5: CRM Dashboard Integration

### Modified File: `src/pages/crm/CrmDashboard.tsx`
- Add a third tab "Integrations" (with Webhook icon) alongside existing "List" and "Kanban" tabs
- The Integrations tab renders `<CrmWebhookManager />`
- No existing tabs or components removed

---

## Phase 6: API Docs Update

### Modified File: `src/pages/admin/ApiDocs.tsx`
Add a new "CRM Webhooks" section at the bottom of the existing CRM tab documenting:
- `GET /rest/v1/crm_webhooks`
- `POST /rest/v1/crm_webhooks`
- `PATCH /rest/v1/crm_webhooks?id=eq.<id>`
- `DELETE /rest/v1/crm_webhooks?id=eq.<id>`
- `GET /rest/v1/crm_webhook_events`
- `POST /functions/v1/deliver-crm-webhooks`
- Standard payload format and HMAC signature verification docs

---

## Files Summary

### New Files Created
1. `supabase/migrations/xxx_add_crm_webhooks.sql` -- tables, RLS, trigger function, trigger
2. `supabase/functions/deliver-crm-webhooks/index.ts` -- delivery edge function
3. `src/hooks/useCrmWebhooks.tsx` -- React hook for CRM webhooks CRUD + logs
4. `src/components/crm/CrmWebhookManager.tsx` -- main webhook management UI
5. `src/components/crm/CrmWebhookForm.tsx` -- webhook creation dialog

### Modified Files (additive only)
1. `src/pages/crm/CrmDashboard.tsx` -- add "Integrations" tab (no existing tabs removed)
2. `src/pages/admin/ApiDocs.tsx` -- add CRM webhooks section to existing CRM tab

### Existing Structures NOT Touched
- `webhooks` table -- unchanged
- `webhook_logs` table -- unchanged
- `useWebhooks` hook -- unchanged
- All existing edge functions -- unchanged
- All existing routes, components, sidebar items -- unchanged
- All existing triggers and database functions -- unchanged

### Permissions
- `crm_webhooks`: Admin full CRUD, Ops SELECT only
- `crm_webhook_events`: Admin SELECT/INSERT, Ops SELECT only
- Postgres trigger fires for all users with write access to `leads` (admin/ops per existing RLS)
- Edge function uses service role for internal delivery

