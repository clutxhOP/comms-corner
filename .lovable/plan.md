

# CRM Enhancements: Full Website URL, Updated By Tracking, and Kanban Card Improvements

## Overview
Three changes to the CRM module: (1) show full clickable URLs instead of "Link" text, (2) add an `updated_by` column to the `leads` table tracking who last modified each lead, and (3) enrich Kanban cards with more lead details including "Last Contacted" and "Last Contacted By".

---

## Change 1: Display Full Website URL (Clickable)

### File: `src/components/crm/LeadTable.tsx`
- In the Website column, replace the current `<ExternalLink icon> Link` text with the full URL displayed as clickable text (truncated with CSS if needed).
- Keep the `target="_blank"` behavior and external link icon.

### File: `src/components/crm/LeadKanban.tsx`
- In Kanban cards, show the full website URL as clickable text instead of just an icon.

---

## Change 2: Add `updated_by` Column

### Database Migration
- Add `updated_by` column (text, nullable) to the `leads` table.
- This stores the user ID of whoever last updated the lead.

### File: `src/hooks/useLeads.tsx`
- Add `updated_by` to the `Lead` interface.
- In `updateLead` and `updateLeadStage`, automatically set `updated_by` to the current user's ID (`user.id` from auth).
- In `addLead`, set `updated_by` to the current user's ID.
- Accept `user` from auth context -- the hook will need the current user ID passed in or fetched internally.

### File: `src/components/crm/LeadTable.tsx`
- Add two new columns after "Stage": **"Last Contacted"** (showing `updated_at` formatted) and **"Last Contacted By"** (showing user name resolved from `updated_by` via `profiles_display`).
- Update the `colSpan` for the empty state row.

### File: `src/pages/crm/CrmDashboard.tsx`
- Pass `user` from `useAuth()` into the hooks/components as needed for setting `updated_by`.

---

## Change 3: Enhanced Kanban Cards

### File: `src/components/crm/LeadKanban.tsx`
Update the `KanbanCard` component to display:
- **Name** (already shown)
- **Email** (already shown)
- **WhatsApp** (already shown)
- **Website** -- full clickable URL
- **Stage** -- colored badge showing the stage name (pass stages data to KanbanCard)
- **Last Contacted** -- `updated_at` formatted as relative or date
- **Last Contacted By** -- resolved user name from `updated_by` using `profiles_display`

### File: `src/pages/crm/CrmDashboard.tsx`
- Fetch `profiles_display` data and pass it to both `LeadTable` and `LeadKanban` for resolving `updated_by` to display names.

---

## Technical Details

### Database Migration (new)
```sql
ALTER TABLE public.leads ADD COLUMN updated_by text;
```

### Files Modified (additive changes only)
1. **`src/hooks/useLeads.tsx`** -- Add `updated_by` to Lead interface; set it on insert/update operations using current auth user ID
2. **`src/components/crm/LeadTable.tsx`** -- Show full website URL; add "Last Contacted" and "Last Contacted By" columns; accept profiles data as prop
3. **`src/components/crm/LeadKanban.tsx`** -- Show full website URL, stage badge, "Last Contacted", "Last Contacted By" on each card; accept stages and profiles as props
4. **`src/pages/crm/CrmDashboard.tsx`** -- Fetch profiles_display; pass profiles and user to child components

### No files deleted. No endpoints, webhooks, or functions removed.

