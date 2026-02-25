

# Fix: Outreach FU Bell Notifications for OPS Users

## Problem

The current code in `handleOutreachInsert` inserts a bell notification only for `user.id` — the currently logged-in user. This means:
- If an admin is online when the entry arrives, only the admin gets a bell notification
- OPS users who are online get the toast (realtime event fires for them too via RLS), but the bell notification is only created for the user whose browser processed it first
- If no OPS user is online when the entry arrives, they never get a bell notification

The bell notification should be created for **all OPS and admin users**, not just the current user.

## Plan

### Change: `src/hooks/useRealtimeNotifications.tsx`

Inside `handleOutreachInsert`, replace the single `chat_notifications` insert (which uses `user_id: user.id`) with logic that:

1. Queries `user_roles` for all users with role `'ops'` or `'admin'`
2. Inserts a `chat_notifications` row for **each** of those users
3. Uses `sender_id: user.id` (the current user, required by RLS) for the insert — but since the RLS check is `auth.uid() = sender_id`, we need to set `sender_id` to the current user for all rows
4. Deduplicates: to prevent multiple online users from each inserting notifications for everyone, add a deduplication key using the outreach entry ID and table name. Before inserting, check if a notification with that `message_preview` already exists for each target user (or use upsert logic)

Actually, a simpler and more robust approach: keep the current self-notification as-is (it works for the logged-in user), but **also** fetch all ops/admin user IDs and insert notifications for those who are not the current user. To prevent duplicates from multiple online users, we'll include the entry ID in the message_preview which naturally deduplicates via the `processedOutreachRef`.

Wait — the RLS on `chat_notifications` INSERT requires `auth.uid() = sender_id`. This means one user **cannot** insert a notification row where `sender_id` is someone else. So we can only insert notifications where `sender_id = current user.id`.

**Revised approach**: Since RLS prevents cross-user inserts from the client, the best solution is:
1. Keep the existing self-insert for the bell notification
2. Add a **database trigger** on each `outreach_fu_*` table that automatically inserts `chat_notifications` rows for all ops and admin users when a new entry is added
3. This trigger runs with elevated privileges (SECURITY DEFINER function) so it bypasses the `sender_id` RLS constraint

### Database Migration

Create a function `notify_outreach_fu_bell()` as `SECURITY DEFINER` that:
- Fires on INSERT to any outreach_fu table
- Queries `user_roles` for all users with `'ops'` or `'admin'` role
- Inserts a `chat_notifications` row for each, with:
  - `user_id` = target user
  - `sender_id` = target user (to satisfy RLS on SELECT/UPDATE)
  - `sender_name` = `'Outreach FU'`
  - `message_preview` = `'New entry (<label>): "<name>"'` where label is derived from `TG_TABLE_NAME`

Add `AFTER INSERT` triggers on all four tables calling this function.

### Frontend Change: `src/hooks/useRealtimeNotifications.tsx`

**Remove** the client-side `supabase.from('chat_notifications').insert(...)` block from `handleOutreachInsert` since the database trigger now handles it. Keep the toast and browser push as-is (those are client-side only).

### Files Changed
- `src/hooks/useRealtimeNotifications.tsx` — remove the bell insert block (replaced by DB trigger)
- New database migration — `notify_outreach_fu_bell()` function + triggers on all 4 tables

