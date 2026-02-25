

# Fix Outreach FU Notifications

## Problem
The database triggers, realtime publication, and frontend realtime subscriptions are all correctly in place. The reason notifications don't appear is that `showNotification()` in `useBrowserNotifications.tsx` **skips notifications when the browser tab is visible and focused** (line 83). Since OPS users are actively on the dashboard when new data arrives, no notification ever fires.

## Root Cause
```
if (!forceShow && document.visibilityState === 'visible' && document.hasFocus()) {
  return null; // <-- silently drops the notification
}
```

Additionally, browser notification permission must be `'granted'` or the entire subscription is skipped (line 145 of `useRealtimeNotifications.tsx`).

## Plan

### Change: Add in-app toast notifications for Outreach FU inserts

Modify `src/hooks/useRealtimeNotifications.tsx` to import `toast` from `sonner` and fire a toast inside `handleOutreachInsert` **in addition to** the existing browser notification call. This mirrors how other parts of the app use sonner toasts for in-app alerts.

- Add `import { toast } from 'sonner'`
- Inside `handleOutreachInsert`, add a `toast()` call with the table label and entry name before calling `showOutreachFUNotification`
- Remove the `permissionStatus !== 'granted'` guard from the outreach FU subscription `useEffect` so toasts fire regardless of browser notification permission
- Keep the browser notification call as-is (it will still fire when the tab is backgrounded)

### Technical Detail
The `showOutreachFUNotification` browser push will continue to work when the tab is not focused. The new toast ensures users see alerts when they are actively on the page. No existing code is altered or deleted -- only additive toast logic within the existing `handleOutreachInsert` function.

### Files Changed
- `src/hooks/useRealtimeNotifications.tsx` -- add sonner toast import and toast call in outreach FU handler, relax permission guard for that subscription

