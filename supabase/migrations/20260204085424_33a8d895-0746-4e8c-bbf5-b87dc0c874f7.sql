-- Create outreach entries table
CREATE TABLE public.outreach_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('reddit', 'linkedin', 'X')),
  link TEXT NOT NULL,
  comment TEXT NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_outreach_platform ON public.outreach_entries(platform);
CREATE INDEX idx_outreach_date ON public.outreach_entries(date);
CREATE INDEX idx_outreach_completed_by ON public.outreach_entries(completed_by);
CREATE INDEX idx_outreach_completed_at ON public.outreach_entries(completed_at);

-- Enable RLS
ALTER TABLE public.outreach_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and Ops can view all entries
CREATE POLICY "Admin and Ops can view entries"
  ON public.outreach_entries
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'ops'::user_role)
  );

-- Policy: Admin and Ops can update entries (for editing notes and toggling completed)
CREATE POLICY "Admin and Ops can update entries"
  ON public.outreach_entries
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'ops'::user_role)
  );

-- Policy: Only Admin can delete entries
CREATE POLICY "Admin can delete entries"
  ON public.outreach_entries
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Policy: Service role can insert (for n8n API via edge functions)
CREATE POLICY "Authenticated can insert entries"
  ON public.outreach_entries
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for outreach_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_entries;