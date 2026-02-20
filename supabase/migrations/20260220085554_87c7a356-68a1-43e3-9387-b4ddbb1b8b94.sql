CREATE POLICY "Allow anon inserts"
  ON public.subreddit_watch
  FOR INSERT
  TO anon
  WITH CHECK (true);