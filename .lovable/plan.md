

# Default "Last Contacted By" to OPS

## Single Change

**File:** `src/components/crm/LeadTable.tsx`

In the `getProfileName` helper (line ~37), change the fallback from `'—'` to `'OPS'` when `userId` is null:

```typescript
// Before
if (!userId) return '—';

// After
if (!userId) return 'OPS';
```

This is the only change. No webhooks, endpoints, functions, database, or structure touched.

