
# Analysis: Current State Already Handles This Correctly

After reviewing the code, the system is already set up to do exactly what you want:

## How It Works Now

1. **UI changes (LeadTable, Kanban):** `useLeads` hook receives `user?.id` from `CrmDashboard` and passes it as `updated_by` in all mutations (`addLead`, `updateLead`, `updateLeadStage`). So when an admin changes a stage, their ID is recorded. When ops does it, their ID is recorded.

2. **API/Edge function changes:** The `crm-leads` edge function extracts `auth.userId` from the JWT/PAT token and sets `updated_by: auth.userId` on every insert/update.

3. **Fallback to Liam:** The database default we just set (`DEFAULT '6a58a5d2-...'`) ensures that if neither the UI nor the API provides an `updated_by`, it defaults to Liam's ID.

4. **Display fallback:** The `getProfileName` function in `LeadTable.tsx` returns "Liam" if `updated_by` is null or the profile lookup fails.

## Conclusion

No changes needed. The current implementation already:
- Shows the actual user (admin, ops) who made the change
- Falls back to Liam when no user ID is available (via DB default + display fallback)

The fix from the previous step (updating leads 12-14 and setting DB defaults) completed the last missing piece.
