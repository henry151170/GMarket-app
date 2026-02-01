-- Add status column to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid' 
CHECK (status IN ('paid', 'pending'));

-- Update existing records to 'paid' (default is already set but good to be explicit for logic)
UPDATE expenses SET status = 'paid' WHERE status IS NULL;
