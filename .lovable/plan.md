

# Build Outreach Follow-Up (FU) Module

## Overview
Create a new "Outreach FU" page accessible to admin and ops roles, with 4 tabs (Day 2, Day 5, Day 7, Dynamic), each backed by its own database table. Includes 4 API endpoints, 4 webhook triggers, OPS email notifications, and API documentation.

## Technical Details

### 1. Database: 4 New Tables (via migration)

Create tables `outreach_fu_day_2`, `outreach_fu_day_5`, `outreach_fu_day_7`, `outreach_fu_dynamic` with identical schema:

```text
Column          | Type          | Notes
id              | int8          | Primary key, auto-increment
name            | text          | NOT NULL
proof           | text          | NOT NULL
created_at      | timestamptz   | DEFAULT now()
done            | boolean       | DEFAULT false
updated_at      | timestamptz   | DEFAULT now()
```

RLS policies (matching existing patterns for admin+ops access):
- Admin: full access (ALL) via `has_role(auth.uid(), 'admin')`
- Ops: SELECT, INSERT, UPDATE via `has_role(auth.uid(), 'ops')`

Enable realtime on all 4 tables for live updates.

Add `updated_at` trigger using existing `update_updated_at_column()` function on each table.

### 2. Webhook Triggers: 4 New Database Triggers

Create a trigger function `notify_outreach_fu_webhook()` that fires on INSERT for each of the 4 tables. It will:
- Determine the trigger name (`outreach_fu_day_2`, etc.) based on `TG_TABLE_NAME`
- Build the webhook payload with `trigger`, `data`, `user` (looked up from profiles), and `timestamp`
- Insert a pending event into `crm_webhook_events` for each matching active webhook in the `webhooks` table that has the corresponding trigger action

### 3. Add 4 New Trigger Actions to Frontend

Update `src/hooks/useWebhooks.tsx` `TRIGGER_ACTIONS` array to include:
- `outreach_fu_day_2` / "Outreach FU Day 2"
- `outreach_fu_day_5` / "Outreach FU Day 5"
- `outreach_fu_day_7` / "Outreach FU Day 7"
- `outreach_fu_dynamic` / "Outreach FU Dynamic"

This makes them selectable when creating/editing webhooks in the existing Webhook Management UI.

### 4. Edge Functions: 4 New API Endpoints

Create 4 edge functions following the exact same dual-auth pattern (JWT + PAT) from `manage-tasks`:
- `supabase/functions/outreach-fu-day-2/index.ts`
- `supabase/functions/outreach-fu-day-5/index.ts`
- `supabase/functions/outreach-fu-day-7/index.ts`
- `supabase/functions/outreach-fu-dynamic/index.ts`

Each function:
1. Authenticates via JWT or PAT (copy `getAuthUserId` + `sha256Hex` from `manage-tasks`)
2. Validates `name` (required, max 500 chars) and `proof` (required, max 2000 chars) using basic validation
3. Inserts into the corresponding table using service role
4. The database trigger fires the webhook automatically
5. Calls `send-task-notifications` edge function to notify OPS team with tab name, entry name, proof, submitter name, and timestamp
6. Returns the created record

Add to `supabase/config.toml`:
```toml
[functions.outreach-fu-day-2]
verify_jwt = false
[functions.outreach-fu-day-5]
verify_jwt = false
[functions.outreach-fu-day-7]
verify_jwt = false
[functions.outreach-fu-dynamic]
verify_jwt = false
```

### 5. OPS Notification

Each edge function, after inserting the record, invokes the existing `send-task-notifications` edge function with:
- `taskTitle`: "New Outreach FU: {name}" 
- `taskType`: "outreach-fu"
- `description`: Includes tab name, proof (as clickable link if URL), submitter name, and timestamp
- `departmentEmails`: `["ops@backendglamor.com"]`

This sends an email to all OPS users using the existing Resend-based notification system.

### 6. Frontend: New Page + Route + Navigation

**New files:**
- `src/pages/admin/OutreachFU.tsx` -- main page component
- `src/hooks/useOutreachFU.tsx` -- data hook for all 4 tables

**Route** in `src/App.tsx`:
```tsx
<Route path="/outreach-fu" element={
  <ProtectedRoute requireOpsOrAdmin>
    <OutreachFU />
  </ProtectedRoute>
} />
```

**Navigation** in `src/components/layout/AppSidebar.tsx`:
- Add "Outreach FU" item to `adminNavItems` and `opsNavItems` arrays with a `Repeat` icon
- URL: `/outreach-fu`

### 7. Frontend: Page UI

The `OutreachFU` page renders a `MainLayout` with `Tabs` for Day 2, Day 5, Day 7, Dynamic.

Each tab contains:

**Stats bar** (3 cards):
- New entries today (count where `created_at` is today)
- Total marked as Done (count where `done = true`)
- Total entries overall

**Table** with columns: checkbox (select), Name, Proof, Done, Created At, Updated At, Actions (edit/delete)

Features:
- Select All checkbox in header + bulk delete button
- Inline editing: click edit icon to toggle row into edit mode with input fields, save/cancel
- `proof` column: if value matches URL pattern, render as clickable `<a>` link opening in new tab; otherwise plain text
- `done` column: toggle checkbox that updates the record
- Timestamps: formatted with `date-fns` `format()` as "MMM d, yyyy HH:mm"
- Delete selected / Delete all with confirmation dialog
- Real-time subscription to table changes

### 8. Data Hook: `useOutreachFU.tsx`

Accepts a `tableName` parameter (`outreach_fu_day_2` | etc.).

Provides:
- `entries`, `loading`, `stats` (today count, done count, total count)
- `toggleDone(id, done)` -- update done status
- `updateEntry(id, { name, proof })` -- inline edit
- `deleteEntries(ids)` -- bulk delete
- Real-time subscription via Supabase channel

### 9. API Documentation

Append a new tab "Outreach FU" (with `Repeat` icon) to the existing `TabsList` in `src/pages/admin/ApiDocs.tsx`. Increase grid cols from 6 to 7.

Document all 4 endpoints with:
- Method: POST
- Path: `/outreach-fu-day-2` (etc.)
- Auth: JWT or PAT (same as existing)
- Request body: `{ name, proof, created_at? }`
- Response: full record object
- Webhook trigger fired
- Sample cURL command

### Summary of All New Files
1. `supabase/migrations/[timestamp].sql` -- 4 tables, RLS, triggers
2. `supabase/functions/outreach-fu-day-2/index.ts`
3. `supabase/functions/outreach-fu-day-5/index.ts`
4. `supabase/functions/outreach-fu-day-7/index.ts`
5. `supabase/functions/outreach-fu-dynamic/index.ts`
6. `src/pages/admin/OutreachFU.tsx`
7. `src/hooks/useOutreachFU.tsx`

### Modified Files (append-only, no deletions)
1. `src/App.tsx` -- add route
2. `src/components/layout/AppSidebar.tsx` -- add nav item
3. `src/hooks/useWebhooks.tsx` -- add 4 trigger actions
4. `src/pages/admin/ApiDocs.tsx` -- add documentation tab
5. `supabase/config.toml` -- add 4 function configs

### Confirmation
No existing tables, triggers, webhooks, endpoints, RLS policies, auth logic, or documentation entries will be modified or deleted. All changes are purely additive.

