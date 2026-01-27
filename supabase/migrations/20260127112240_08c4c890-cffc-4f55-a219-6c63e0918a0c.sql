-- Add human_mode_status and updated_at columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS human_mode_status boolean NOT NULL DEFAULT false;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_customers_human_mode_status ON public.customers(human_mode_status);

-- Enable realtime for customers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;

-- Update RLS policies to allow ops role to view customers
CREATE POLICY "Ops can view all customers"
ON public.customers
FOR SELECT
USING (has_role(auth.uid(), 'ops'::user_role));

CREATE POLICY "Ops can update customers"
ON public.customers
FOR UPDATE
USING (has_role(auth.uid(), 'ops'::user_role));