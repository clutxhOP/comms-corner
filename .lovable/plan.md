

# Fix "Last Contacted By" Data and Defaults

## Part 1: Fix existing data
Update leads currently showing "Abdullahi Kareem" as `updated_by` to Liam's user ID (`6a58a5d2-8287-4829-a333-e56a5e7e93ee`). These are leads 12, 13, 14 in the "new-lead" stage.

**Action:** Use the data insert tool to run:
```sql
UPDATE leads SET updated_by = '6a58a5d2-8287-4829-a333-e56a5e7e93ee' WHERE id IN (12, 13, 14);
```

## Part 2: Default `updated_by` column to Liam
Add a database default so any lead inserted without an explicit `updated_by` automatically gets Liam's ID.

**Action:** Migration to set column default:
```sql
ALTER TABLE leads ALTER COLUMN updated_by SET DEFAULT '6a58a5d2-8287-4829-a333-e56a5e7e93ee';
ALTER TABLE leads ALTER COLUMN created_by SET DEFAULT '6a58a5d2-8287-4829-a333-e56a5e7e93ee';
```

## Part 3: Code fallback already done
The `getProfileName` function in `LeadTable.tsx` already falls back to "Liam" when `updated_by` is null or profile not found (from previous edit). No further code changes needed.

### Files changed
- Database: `leads` table data update + column defaults
- No code file changes

