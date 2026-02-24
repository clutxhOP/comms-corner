

# CRM Enhancements: Source Column, Lead Value, and Statistics Charts

## Overview
Three additions to the CRM module: (1) a "Source" field for leads with default options and custom source management, (2) a "Lead Value" field for tracking monetary value per lead, and (3) multiple chart types (pie, bar) for the statistics section. No existing webhooks, endpoints, functions, or table structures will be deleted.

---

## Change 1: Source Column

### Database Migration
Add a `source` column to the `leads` table and create a `lead_sources` table for managing source options.

```sql
-- Add source column to leads
ALTER TABLE public.leads ADD COLUMN source text;

-- Create lead_sources table for customizable options
CREATE TABLE public.lead_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text, -- optional icon identifier
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default sources
INSERT INTO public.lead_sources (id, name, position) VALUES
  ('reddit', 'Reddit', 1),
  ('twitter', 'X (Twitter)', 2),
  ('facebook', 'Facebook', 3),
  ('whatsapp', 'WhatsApp', 4);

-- RLS: admin and ops can CRUD
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Ops can select lead_sources" ON public.lead_sources FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can insert lead_sources" ON public.lead_sources FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can update lead_sources" ON public.lead_sources FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can delete lead_sources" ON public.lead_sources FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_sources;
```

### New File: `src/hooks/useLeadSources.tsx`
- Fetch all active sources sorted by position
- CRUD: addSource, updateSource, deleteSource
- Realtime subscription on `lead_sources`

### File Changes: `src/hooks/useLeads.tsx`
- Add `source` to the `Lead` interface
- Add `source` param to `addLead`
- Add `bySource` stats computation (count per source)

### File Changes: `src/components/crm/AddLeadDialog.tsx`
- Add `sources` prop
- Add Source dropdown (with options from `lead_sources`)
- Pass `source` value in `onAdd` callback

### File Changes: `src/components/crm/LeadTable.tsx`
- Add "Source" column header after "Website"
- Show source as a Badge in each row
- Make source editable inline (dropdown) when editing
- Update colSpan for empty state

### File Changes: `src/components/crm/LeadKanban.tsx`
- Show source as a small badge/label on each Kanban card

### File Changes: `src/pages/crm/CrmDashboard.tsx`
- Import and use `useLeadSources` hook
- Pass `sources` to `AddLeadDialog`
- Add a "Manage Sources" button or integrate into existing StageManagerDialog
- Pass sources to LeadTable and LeadKanban

### New File: `src/components/crm/SourceManagerDialog.tsx`
- Modal to add/edit/delete lead sources
- Fields: id (auto-slug), name, position, active toggle
- Similar pattern to StageManagerDialog

---

## Change 2: Lead Value Field

### Database Migration
```sql
ALTER TABLE public.leads ADD COLUMN value numeric DEFAULT 0;
```

### File Changes: `src/hooks/useLeads.tsx`
- Add `value` to the `Lead` interface
- Update `pipelineValue` stat to use the dedicated `value` column instead of `metadata.value`
- Include `value` in addLead params

### File Changes: `src/components/crm/AddLeadDialog.tsx`
- Add "Lead Value" number input field
- Pass `value` in onAdd callback

### File Changes: `src/components/crm/LeadTable.tsx`
- Add "Value" column header (after Source)
- Display formatted dollar amount
- Make value editable inline
- Update colSpan for empty state

### File Changes: `src/components/crm/LeadKanban.tsx`
- Show value on Kanban card if > 0

---

## Change 3: Statistics Display Options (Pie Chart, Bar Chart)

### File Changes: `src/components/crm/CrmStats.tsx`
- Add a toggle/select to switch between display modes: **Bar** (current horizontal bar), **Pie Chart**, and **Bar Chart** (vertical)
- Use `recharts` (already installed) for Pie and Bar chart rendering
- Import `PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer` from recharts
- Add state for selected chart type
- Render the appropriate chart based on selection
- Add `bySource` data display as a secondary chart/section
- Accept `bySource` in stats prop for source distribution

### Stats interface update:
```typescript
stats: {
  total: number;
  active: number;
  conversionRate: number;
  pipelineValue: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
}
```

---

## Change 4: API Docs Update

### File Changes: `src/pages/admin/ApiDocs.tsx`
- Update the POST /leads endpoint docs to include `source` and `value` fields in request body
- Update the GET /leads response example to include `source` and `value`
- Update the PATCH /leads request body example to include `source` and `value`
- Add `lead_sources` endpoints:
  - GET /rest/v1/lead_sources
  - POST /rest/v1/lead_sources
  - PATCH /rest/v1/lead_sources?id=eq.{id}
  - DELETE /rest/v1/lead_sources?id=eq.{id}

---

## Files Summary

### New Files
1. `supabase/migrations/xxx_add_source_value_and_lead_sources.sql`
2. `src/hooks/useLeadSources.tsx`
3. `src/components/crm/SourceManagerDialog.tsx`

### Modified Files (additive only)
1. `src/hooks/useLeads.tsx` -- add `source`, `value` to interface; update stats with `bySource`
2. `src/components/crm/AddLeadDialog.tsx` -- add Source dropdown and Value input
3. `src/components/crm/LeadTable.tsx` -- add Source and Value columns
4. `src/components/crm/LeadKanban.tsx` -- show source badge and value on cards
5. `src/components/crm/CrmStats.tsx` -- add pie/bar chart toggles using recharts; add source distribution
6. `src/pages/crm/CrmDashboard.tsx` -- integrate useLeadSources; pass data to components; add Manage Sources button
7. `src/pages/admin/ApiDocs.tsx` -- add source/value fields to CRM docs; add lead_sources endpoints

### No Deletions
No existing webhooks, endpoints, functions, or table structures will be deleted.
