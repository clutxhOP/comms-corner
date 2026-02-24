

# Add Follow-Ups Tab to CRM Dashboard

## What Changes
Move the Follow-Up Manager out of the Integrations tab and give it its own dedicated tab in the CRM dashboard, positioned between Kanban and Integrations.

## Technical Details

### Modified File: `src/pages/crm/CrmDashboard.tsx`
- Add a new `TabsTrigger` for "Follow-Ups" with a `CalendarClock` icon, placed after Kanban and before Integrations
- Add a new `TabsContent` rendering the `<FollowUpManager />` component
- Import `FollowUpManager` and `CalendarClock` icon

### Modified File: `src/components/crm/CrmWebhookManager.tsx`
- Remove the `<FollowUpManager />` import and rendering from the Integrations section, since it now lives in its own tab

### Tab Order After Change
```text
[ List ] [ Kanban ] [ Follow-Ups ] [ Integrations ]
```

No database or backend changes needed -- this is purely a UI reorganization.
