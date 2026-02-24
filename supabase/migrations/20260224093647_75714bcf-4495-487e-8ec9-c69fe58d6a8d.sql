
-- Create lead_stages table
CREATE TABLE public.lead_stages (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  position int4 NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create leads table with auto-increment
CREATE SEQUENCE public.leads_id_seq START WITH 1;
CREATE TABLE public.leads (
  id bigint PRIMARY KEY DEFAULT nextval('public.leads_id_seq'),
  name text NOT NULL,
  email text,
  whatsapp text,
  website text,
  stage_id text REFERENCES public.lead_stages(id),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS for lead_stages: admin and ops can do everything
CREATE POLICY "Admin and Ops can select lead_stages" ON public.lead_stages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can insert lead_stages" ON public.lead_stages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can update lead_stages" ON public.lead_stages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can delete lead_stages" ON public.lead_stages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));

-- RLS for leads: admin and ops can select/insert/update, only admin can delete
CREATE POLICY "Admin and Ops can select leads" ON public.leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin and Ops can update leads" ON public.leads FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));
CREATE POLICY "Admin can delete leads" ON public.leads FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_lead_stages_updated_at BEFORE UPDATE ON public.lead_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Seed lead_stages
INSERT INTO public.lead_stages (id, name, color, position) VALUES
  ('new-lead', 'New Lead', '#28a745', 1),
  ('contacted', 'Contacted', '#007BFF', 2),
  ('qualified', 'Qualified', '#6f42c1', 3),
  ('proposal-sent', 'Proposal Sent', '#fd7e14', 4),
  ('negotiation', 'Negotiation', '#ffc107', 5),
  ('closed-won', 'Closed Won', '#20c997', 6),
  ('closed-lost', 'Closed Lost', '#dc3545', 7);
