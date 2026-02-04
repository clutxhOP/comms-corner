-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated can insert entries" ON public.outreach_entries;

-- Note: Inserts will be done via edge function using service role key, so no RLS insert policy needed for regular users