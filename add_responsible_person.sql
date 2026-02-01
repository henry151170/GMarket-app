-- Add responsible_person column to daily_incomes
ALTER TABLE daily_incomes 
ADD COLUMN IF NOT EXISTS responsible_person TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_incomes' AND column_name = 'responsible_person';
