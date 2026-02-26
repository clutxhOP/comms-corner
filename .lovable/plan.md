

# Default "Last Contacted By" to "Liam" When Unknown

## Current Behavior
The `updated_by` field already stores the user ID of whoever (admin or ops) performs changes. The `getProfileName` function looks up their name from `profiles`. This part works correctly.

The only gap: when `updated_by` is `null` (e.g., leads created via API/webhook without a user context), it currently shows "OPS".

## Change

**File:** `src/components/crm/LeadTable.tsx` — `getProfileName` function (line 36-39)

Update the fallback logic:
- When `userId` is null → return `'Liam'`
- When profile lookup fails (user ID exists but no matching profile) → also return `'Liam'` instead of showing a raw UUID

```typescript
const getProfileName = (userId: string | null) => {
  if (!userId) return 'Liam';
  const p = profiles.find(p => p.user_id === userId);
  return p?.full_name || 'Liam';
};
```

No changes to webhooks, endpoints, functions, or database structure. The existing `updated_by` tracking for admin/ops users continues to work — this only affects the display fallback.

