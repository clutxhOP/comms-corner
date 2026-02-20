-- Allow any authenticated user to insert into subreddit_watch
CREATE POLICY "Authenticated can insert subreddit_watch"
  ON public.subreddit_watch
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
