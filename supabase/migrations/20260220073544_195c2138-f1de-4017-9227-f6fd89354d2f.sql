CREATE TABLE public.subreddit_watch (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subreddit TEXT,
  count TEXT,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subreddit_watch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Ops can view subreddit_watch"
  ON public.subreddit_watch FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role)
      OR has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin and Ops can insert subreddit_watch"
  ON public.subreddit_watch FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role)
           OR has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin and Ops can update subreddit_watch"
  ON public.subreddit_watch FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role)
      OR has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Admin and Ops can delete subreddit_watch"
  ON public.subreddit_watch FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role)
      OR has_role(auth.uid(), 'ops'::user_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.subreddit_watch;