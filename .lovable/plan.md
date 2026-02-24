

# CRM Tab for Lead Journey Tracking

## Overview
Add a full CRM module with lead tracking, pipeline management, Kanban board, and stage management. Accessible only to admin and ops roles. No existing files, routes, or database structures will be modified -- only new additions.

## Phase 1: Database Migration

### New Tables

**`lead_stages` table:**
- `id` (text, PK) -- slug like 'new-lead', 'contacted'
- `name` (text, not null) -- display name
- `color` (text, not null) -- hex color
- `position` (int4, not null) -- sort order
- `is_active` (boolean, default true)
- `created_by` (text)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**`leads` table:**
- `id` (bigint, auto-increment PK, sequence starting at 1)
- `name` (text, not null)
- `email` (text, nullable)
- `whatsapp` (text, nullable)
- `website` (text, nullable)
- `stage_id` (text, FK to lead_stages.id)
- `created_by` (text)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- `metadata` (jsonb, default '{}')

**Seed data for `lead_stages`:**
1. new-lead / New Lead / #28a745 / position 1
2. contacted / Contacted / #007BFF / position 2
3. qualified / Qualified / #6f42c1 / position 3
4. proposal-sent / Proposal Sent / #fd7e14 / position 4
5. negotiation / Negotiation / #ffc107 / position 5
6. closed-won / Closed Won / #20c997 / position 6
7. closed-lost / Closed Lost / #dc3545 / position 7

**RLS Policies:**
- `lead_stages`: SELECT/INSERT/UPDATE/DELETE for admin and ops via `has_role()`
- `leads`: SELECT/INSERT/UPDATE for admin and ops; DELETE for admin only

**Realtime:** Enable for both tables via `ALTER PUBLICATION supabase_realtime ADD TABLE`.

**Trigger:** `update_updated_at_column` on both tables for auto-updating `updated_at`.

## Phase 2: New Files -- Hooks

### `src/hooks/useLeadStages.tsx`
- Fetch all active stages sorted by position
- CRUD operations: add, update, delete stage
- Realtime subscription on `lead_stages`
- Uses existing `supabase` client and `useToast`

### `src/hooks/useLeads.tsx`
- Fetch leads with stage info, search/filter by stage_id
- CRUD: addLead, updateLead, deleteLead, updateLeadStage (for drag-drop)
- Realtime subscription on `leads`
- Computed stats: total, active (non-closed), by-stage counts, conversion rate

## Phase 3: New Files -- Components

### `src/components/crm/CrmStats.tsx`
- Stat cards: Total Leads, Active Leads, Conversion Rate (closed-won %), Pipeline Value (if metadata.value exists)
- Stage distribution -- small colored bar chart or pie showing count per stage

### `src/components/crm/LeadTable.tsx`
- Columns: Checkbox, ID (#), Name, Email, WhatsApp (tel: link), Website (clickable), Stage (dropdown using lead_stages), Created, Actions
- Inline editing: click row to edit fields, stage dropdown pulls from `lead_stages`
- Bulk actions bar: select all/selected, bulk stage change (dropdown), bulk delete (admin only)
- Filters: stage_id dropdown, search by name/email
- Pagination
- Role checks: hide delete for ops users

### `src/components/crm/LeadKanban.tsx`
- Columns from `lead_stages` (sorted by position, only `is_active`)
- Cards show: lead ID, name, email/whatsapp preview, website icon link
- Drag-and-drop using `@dnd-kit/core` + `@dnd-kit/sortable` (new dependency)
- On drop: update `stage_id` via `updateLeadStage()`

### `src/components/crm/AddLeadDialog.tsx`
- Modal form: name (required), email, whatsapp, website, stage_id (dropdown from lead_stages, default 'new-lead'), metadata
- Validation with zod

### `src/components/crm/StageManagerDialog.tsx`
- Admin/ops modal to manage stages
- Table: ID (text, editable on create), Name, Color (color input), Position (number), Active toggle, Delete button
- Add new stage: auto-generate slug from name
- Ensures dropdowns stay in sync

## Phase 4: New Page

### `src/pages/crm/CrmDashboard.tsx`
- Top: `<CrmStats />`
- Toggle between List View (`<LeadTable />`) and Kanban View (`<LeadKanban />`)
- "Add Lead" button opens `<AddLeadDialog />`
- "Manage Stages" button opens `<StageManagerDialog />` (admin/ops)
- Wrapped in `<MainLayout />`

## Phase 5: Routing and Navigation (Additive Only)

### `src/App.tsx` -- Add new route:
```
<Route path="/crm" element={
  <ProtectedRoute requireOpsOrAdmin>
    <CrmDashboard />
  </ProtectedRoute>
} />
```

### `src/components/layout/AppSidebar.tsx` -- Add CRM nav item:
- Add to `adminNavItems` array: `{ title: "CRM", url: "/crm", icon: Contact }` (using lucide `Contact` icon)
- Add to `opsNavItems` array: same entry
- This makes CRM visible to admin (via admin section) and ops (via ops section), hidden from dev

## Phase 6: API Docs Update

### `src/pages/admin/ApiDocs.tsx` -- Add new "CRM" tab:
- Add a 6th tab trigger "CRM" with a Contact icon
- Update `TabsList` grid from `grid-cols-5` to `grid-cols-6`
- Document endpoints (these are direct Supabase table operations, not edge functions, but documented for reference):
  - POST /leads -- create lead
  - GET /leads -- list with filters
  - PUT /leads/:id -- update
  - DELETE /leads/:id -- admin only
  - GET /lead-stages -- list active stages
  - POST /lead-stages -- create
  - PUT /lead-stages/:id -- update
  - DELETE /lead-stages/:id -- delete
- All existing tabs and content remain untouched

## Phase 7: Permissions Summary

| Action | Admin | Ops | Dev |
|--------|-------|-----|-----|
| View CRM | Yes | Yes | No |
| Add Lead | Yes | Yes | No |
| Edit/Move Lead | Yes | Yes | No |
| Delete Lead | Yes | No | No |
| Manage Stages | Yes | Yes | No |
| Bulk Delete | Yes | No | No |

## Phase 8: New Dependencies
- `@dnd-kit/core` -- drag and drop framework
- `@dnd-kit/sortable` -- sortable preset for Kanban
- `@dnd-kit/utilities` -- CSS transform utilities

## New Files Summary
1. `supabase/migrations/xxx_add_leads_and_lead_stages.sql`
2. `src/hooks/useLeadStages.tsx`
3. `src/hooks/useLeads.tsx`
4. `src/components/crm/CrmStats.tsx`
5. `src/components/crm/LeadTable.tsx`
6. `src/components/crm/LeadKanban.tsx`
7. `src/components/crm/AddLeadDialog.tsx`
8. `src/components/crm/StageManagerDialog.tsx`
9. `src/pages/crm/CrmDashboard.tsx`

## Existing Files Modified (Additive Only)
1. `src/App.tsx` -- add 1 new Route
2. `src/components/layout/AppSidebar.tsx` -- add CRM item to `adminNavItems` and `opsNavItems`
3. `src/pages/admin/ApiDocs.tsx` -- add CRM tab (no existing content changed)

