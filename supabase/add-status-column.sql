-- Add status column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'maintenance'));

-- Update existing equipment to have a status
UPDATE public.equipment SET status = 'available' WHERE status IS NULL;
