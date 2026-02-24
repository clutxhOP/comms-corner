

# Include Full Lead Data in Follow-Up Webhook Payloads

## Problem
The `notify_crm_followup_webhook()` trigger currently sends:
```text
{
  "event": "fu.created",
  "follow_up": { id, lead_id, title, ... },
  "lead_id": 123
}
```
The receiving system only gets a `lead_id` number -- no lead name, email, whatsapp, stage, or any other useful data. This means external systems can't act on the lead without making another API call.

## Solution
Update the database trigger function to fetch the lead row and include it in the webhook payload.

### Modified: `notify_crm_followup_webhook()` trigger function (via migration)

The updated payload will look like:
```text
{
  "event": "fu.created",
  "follow_up": { id, lead_id, title, notes, scheduled_at, ... },
  "lead_id": 123,
  "lead": {
    "id": 123,
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "whatsapp": "+1234567890",
    "website": "https://acme.com",
    "stage_id": "contacted",
    "source": "manual",
    "value": 5000,
    "metadata": { ... }
  }
}
```

The trigger will do a `SELECT * FROM leads WHERE id = NEW.lead_id` and embed the result as `row_to_json(v_lead)` in the payload.

### Modified: `src/pages/admin/ApiDocs.tsx`
Update the webhook event payload examples to show the `lead` object is now included alongside `lead_id`.

## Technical Detail
- Single database migration: `CREATE OR REPLACE FUNCTION public.notify_crm_followup_webhook()` with the added lead lookup
- The lead lookup uses the existing `leads` table -- no new tables or columns
- If the lead is somehow missing (deleted), the payload will include `"lead": null`
- No changes to the edge function, hook, or UI -- only the trigger and docs

