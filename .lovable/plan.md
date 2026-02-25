

# Widen CRM Name Column

The name "Test Test Test" is wrapping across three lines because the Name column is too narrow. Fix: add a `min-w-[180px]` and `whitespace-nowrap` to the Name column header and cells in `LeadTable.tsx`.

## Changes

**`src/components/crm/LeadTable.tsx`**
- Name `<TableHead>`: add `className="min-w-[180px]"`
- Name `<TableCell>`: add `whitespace-nowrap` so text stays on one line

This ensures names display horizontally on a single line, with the table remaining horizontally scrollable for overflow.

