-- Create lead_assignments table for tracking lead approvals and reassignments
CREATE TABLE public.lead_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT,
  client_whatsapp TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  post_url TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement TEXT NOT NULL,
  website TEXT,
  icp TEXT,
  business_id UUID NOT NULL,
  reassigned_business_id UUID,
  reassigned_whatsapp TEXT,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('approved', 'disapproved')),
  assigned_by UUID NOT NULL,
  reassigned_by UUID,
  reassignment_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reassigned_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_assignments
CREATE POLICY "Admins can do everything on lead_assignments"
ON public.lead_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Ops can view and insert lead_assignments"
ON public.lead_assignments
FOR SELECT
USING (has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Ops can insert lead_assignments"
ON public.lead_assignments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Ops can update lead_assignments"
ON public.lead_assignments
FOR UPDATE
USING (has_role(auth.uid(), 'ops'::user_role));

-- Create index for faster lookups
CREATE INDEX idx_lead_assignments_lead_id ON public.lead_assignments(lead_id);
CREATE INDEX idx_lead_assignments_business_id ON public.lead_assignments(business_id);
CREATE INDEX idx_lead_assignments_approval_status ON public.lead_assignments(approval_status);