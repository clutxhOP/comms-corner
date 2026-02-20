

# Subreddit Watch Table Improvements

## Changes

### 1. Display sequential row numbers instead of database IDs
The ID column will show a 1-based index (1, 2, 3...) instead of the actual database ID (10, 11, ...).

### 2. Row selection with checkboxes
Add a checkbox column on the left side of each row, allowing users to select individual rows or all rows at once via a header checkbox. Selected rows will be visually highlighted.

### 3. Only subreddit column is editable
Remove the ability to edit the "count" column from the inline edit mode. When editing, only the subreddit field will show an input. The count column will always display as read-only text.

## Technical Details

### File: `src/pages/admin/SubredditWatch.tsx`
- Add `selectedIds` state (`Set<number>`) to track selected rows
- Add a checkbox in the table header for "select all" on the current page
- Add a checkbox in each row tied to `selectedIds`
- Change the ID column to display `page * PAGE_SIZE + index + 1` instead of `entry.id`
- In edit mode, remove the `<Input>` for the count column -- show plain text instead
- Update `saveEdit` to only pass subreddit (not count) to `updateEntry`

### File: `src/hooks/useSubredditWatch.tsx`
- Update `updateEntry` to only accept and update the `subreddit` field (remove `count` parameter from the update payload since count is managed externally by automations)

