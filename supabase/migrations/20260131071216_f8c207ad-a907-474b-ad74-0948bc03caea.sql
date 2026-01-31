-- Add reassigned_business_ids column as JSONB array
ALTER TABLE public.lead_assignments
ADD COLUMN IF NOT EXISTS reassigned_business_ids jsonb DEFAULT '[]'::jsonb;