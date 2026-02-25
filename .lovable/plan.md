

# Add Outreach FU Notifications to the Bell

## What Changes

When a new Outreach FU entry arrives via realtime, in addition to the existing toast and browser push, insert a row into the `chat_notifications` table so it appears in the notification bell dropdown.

## Technical Details

### 1. `src/hooks/useRealtimeNotifications.tsx`
Inside `handleOutreachInsert`, after the toast call, insert a notification into `chat_notifications`:
- `user_id`: current user's ID
- `sender_name`: `"Outreach FU"` (used as the display name)
- `message_preview`: `"New entry (Day 2): \"John Doe\""` — contains the label and entry name
- `sender_id`: current user's ID (required field, system-generated notification)
- `channel_id`: `null`
- `message_id`: `null`

### 2. `src/components/chat/NotificationBell.tsx`
Update the notification row rendering to handle non-mention notifications:
- Instead of always showing `"{sender_name} mentioned you"`, check if `channel_id` is null
- If `channel_id` is null (system notification like outreach FU), show `sender_name` as a bold title and `message_preview` as the body directly
- If `channel_id` exists (chat mention), keep existing "mentioned you" behavior
- When clicking a notification without a `channel_id`, don't navigate to `/chat` — instead just mark as read and close the popover

### No Database Changes
The `chat_notifications` table already supports nullable `channel_id` and `message_id`, so no migration is needed. No existing structures are altered.

### Files Changed
- `src/hooks/useRealtimeNotifications.tsx` — add `supabase.from('chat_notifications').insert(...)` in `handleOutreachInsert`
- `src/components/chat/NotificationBell.tsx` — conditional rendering for system vs. mention notifications

