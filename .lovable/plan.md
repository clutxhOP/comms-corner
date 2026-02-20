

# Add Anonymous Insert Policy to subreddit_watch

## Overview
Add a single RLS policy to allow the `anon` role to insert rows into the `subreddit_watch` table. No existing policies, code, or files are modified.

## Security Note
This policy allows unauthenticated users to insert data. Existing admin/ops policies for SELECT, UPDATE, and DELETE remain unchanged.

## Technical Details

A single SQL migration will be run:

```text
CREATE POLICY "Allow anon inserts"
  ON public.subreddit_watch
  FOR INSERT
  TO anon
  WITH CHECK (true);
```

No code or file changes are required -- only this one database migration.

