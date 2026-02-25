

# Create CRM Edge Function Endpoints

## Problem
The current API docs reference direct PostgREST paths (`/rest/v1/leads`, `/rest/v1/lead_stages`, etc.) which don't work as edge function endpoints from external tools like n8n. The user expects dedicated edge functions prefixed with `/crm-`.

## Plan

### Step 1: Create `crm-leads` Edge Function
Create `supabase/functions/crm-leads/index.ts` — a new edge function handling full CRUD for the `leads` table:
- **POST** — Insert a new lead (requires `name`)
- **GET** — List leads with optional query params (`stage_id`, `source`, `name` ilike search)
- **PATCH** — Update a lead by `id` query param
- **DELETE** — Delete a lead by `id` query param
- Auth: JWT or PAT validation (reuse the same pattern from `manage-tasks`)
- Role check: admin or ops for all ops, admin-only for DELETE

### Step 2: Create `crm-stages` Edge Function
Create `supabase/functions/crm-stages/index.ts` — CRUD for `lead_stages` table:
- **GET** — List all stages ordered by position
- **POST** — Create a stage
- **PATCH** — Update a stage by `id`
- **DELETE** — Delete a stage by `id`

### Step 3: Create `crm-sources` Edge Function
Create `supabase/functions/crm-sources/index.ts` — CRUD for `lead_sources` table:
- **GET** — List all sources ordered by position
- **POST** — Create a source
- **PATCH** — Update a source by `id`
- **DELETE** — Delete a source by `id`

### Step 4: Create `crm-webhooks` Edge Function
Create `supabase/functions/crm-webhooks/index.ts` — CRUD for `crm_webhooks` table:
- **GET** — List webhooks
- **POST** — Create webhook (admin only)
- **PATCH** — Update webhook (admin only)
- **DELETE** — Delete webhook (admin only)

### Step 5: Create `crm-webhook-events` Edge Function
Create `supabase/functions/crm-webhook-events/index.ts` — Read-only for `crm_webhook_events`:
- **GET** — List webhook events with optional `status` and `event_type` filters

### Step 6: Register all new functions in `supabase/config.toml`
Add `verify_jwt = false` entries for `crm-leads`, `crm-stages`, `crm-sources`, `crm-webhooks`, `crm-webhook-events`.

### Step 7: Update API Docs
Update `src/pages/admin/ApiDocs.tsx` to change all CRM endpoint paths:
- `/rest/v1/leads` → `/crm-leads`
- `/rest/v1/lead_stages` → `/crm-stages`
- `/rest/v1/lead_sources` → `/crm-sources`
- `/rest/v1/crm_webhooks` → `/crm-webhooks`
- `/rest/v1/crm_webhook_events` → `/crm-webhook-events`

Query param format will change from PostgREST style (`?id=eq.5`) to simple params (`?id=5`).

### Technical Details
- Each edge function follows the existing pattern from `manage-tasks/index.ts`: CORS headers, PAT + JWT auth, service-role Supabase client for DB operations
- No changes to the frontend hooks (`useLeads`, etc.) — those continue using the Supabase JS client directly
- No database schema changes needed

