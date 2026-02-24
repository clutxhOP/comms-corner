
-- Add source and value columns to leads
ALTER TABLE public.leads ADD COLUMN source text;
ALTER TABLE public.leads ADD COLUMN value numeric DEFAULT 0;

-- Create lead_sources table
CREATE TABLE public.lead_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default sources
INSERT INTO public.lead_sources (id, name, position) VALUES
  ('reddit', 'Reddit', 1),
  ('twitter', 'X (Twitter)', 2),
  ('facebook', 'Facebook', 3),
  ('whatsapp', 'WhatsApp', 4);

-- RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Ops can select lead_sources" ON public.lead_sources FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can insert lead_sources" ON public.lead_sources FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can update lead_sources" ON public.lead_sources FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can delete lead_sources" ON public.lead_sources FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_sources;
