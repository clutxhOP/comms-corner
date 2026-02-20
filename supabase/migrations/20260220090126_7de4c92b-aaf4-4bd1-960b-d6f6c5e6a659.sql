
-- Drop the existing anon insert policy (it was not scoped to anon role)
DROP POLICY IF EXISTS "Allow anon inserts" ON public.subreddit_watch;

-- Recreate it explicitly targeting the anon role
CREATE POLICY "Allow anon inserts"
  ON public.subreddit_watch
  FOR INSERT
  TO anon
  WITH CHECK (true);
