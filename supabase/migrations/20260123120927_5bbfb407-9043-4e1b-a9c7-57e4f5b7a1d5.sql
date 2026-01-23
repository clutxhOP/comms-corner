-- Change trigger_action to an array to support multiple triggers
ALTER TABLE public.webhooks 
ALTER COLUMN trigger_action TYPE text[] USING ARRAY[trigger_action];