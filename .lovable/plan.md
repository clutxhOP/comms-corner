

# Bulk Delete for Selected Subreddit Watch Rows

## Overview
Add a "Delete Selected" button that appears when one or more rows are selected, with a confirmation dialog before performing the bulk deletion.

## Technical Details

### File: `src/pages/admin/SubredditWatch.tsx`

1. **Add bulk delete state**: Add `bulkDeleting` boolean state for loading indicator during deletion.

2. **Add bulk delete handler**: Create `handleBulkDelete` async function that iterates through `selectedIds`, calls `deleteEntry(id)` for each, then clears the selection.

3. **Add bulk action bar**: When `selectedIds.size > 0`, render a bar between the search input and the table showing:
   - Text: "{N} selected"
   - "Clear selection" button
   - "Delete selected" button (destructive variant)

4. **Add confirmation dialog**: Wrap the "Delete selected" button in an `AlertDialog` with:
   - Title: "Delete selected entries?"
   - Description: "This will permanently remove {N} entries from the watch list."
   - Cancel and Delete action buttons
   - Disable the Delete button while `bulkDeleting` is true

### File: `src/hooks/useSubredditWatch.tsx`
No changes needed -- the existing `deleteEntry` function will be called per selected ID.

