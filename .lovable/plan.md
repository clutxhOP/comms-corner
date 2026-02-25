

# Rename CRM "Email" to "Profile URL" + Make Only Name Required

## Changes Required

### 1. Database Migration
Rename the `email` column on the `leads` table to `profile_url`:
```sql
ALTER TABLE public.leads RENAME COLUMN email TO profile_url;
```
The existing webhook triggers (`notify_crm_webhook`, `notify_crm_followup_webhook`) use `row_to_json(NEW)`, so they will automatically output `profile_url` instead of `email` -- no trigger changes needed.

### 2. Frontend: `src/hooks/useLeads.tsx`
- Rename `email` to `profile_url` in the `Lead` interface
- Update search query from `email.ilike` to `profile_url.ilike`
- Update `addLead` parameter type: `email?` → `profile_url?`

### 3. Frontend: `src/components/crm/LeadTable.tsx`
- Column header: "Email" → "Profile URL"
- Edit field: change from email input to URL input
- Display: render as clickable link (like Website column) with `ExternalLink` icon instead of plain text
- Update `startEdit` and `editData` references from `email` to `profile_url`

### 4. Frontend: `src/components/crm/LeadKanban.tsx`
- Replace `Mail` icon + `lead.email` with `ExternalLink` icon + clickable `lead.profile_url` link

### 5. Frontend: `src/components/crm/AddLeadDialog.tsx`
- Rename "Email" label to "Profile URL"
- Change input type from `email` to `url` with appropriate placeholder
- Update state variable and submission from `email` to `profileUrl`

### 6. API Documentation: `src/pages/admin/ApiDocs.tsx`
- All references to `"email"` in CRM lead request/response examples → `"profile_url"`
- Update field descriptions: "email@example.com" → "https://profile.example.com"
- CRM webhook payload examples: `"email"` → `"profile_url"`
- Follow-up webhook payload examples: same change
- For lead creation endpoint: clarify only `name` is required, all others optional

### 7. Edge Function: No changes needed
The manage-customers and record-lead-sent functions reference `customers` table (not `leads`), so they're unaffected. The CRM webhook triggers auto-reflect the column rename via `row_to_json`.

### Summary
- 1 DB migration (column rename)
- 5 frontend files updated (hook, table, kanban, dialog, API docs)
- Zero trigger/webhook/endpoint changes needed (auto-reflected)

