-- Add difference tracking columns to daily_incomes
ALTER TABLE daily_incomes 
ADD COLUMN difference_amount numeric(10,2) DEFAULT 0,
ADD COLUMN difference_reason text,
ADD COLUMN difference_note text;

-- Optional: Create an enum for reasons if strictly enforced, but text is more flexible for now, 
-- or we can enforce it in application code.
