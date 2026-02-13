-- Add 'awaiting-business' to the task_type enum
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'awaiting-business';