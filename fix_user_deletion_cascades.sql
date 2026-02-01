-- Fix User Deletion Cascades
-- This script modifies foreign keys to allow deleting a user (from 'profiles' or 'auth.users') 
-- by automatically deleting their associated records (CASCADE).

-- 1. expense_categories (The reported error)
ALTER TABLE expense_categories
DROP CONSTRAINT IF EXISTS expense_categories_user_id_fkey;

ALTER TABLE expense_categories
ADD CONSTRAINT expense_categories_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 2. daily_incomes
ALTER TABLE daily_incomes
DROP CONSTRAINT IF EXISTS daily_incomes_user_id_fkey;

ALTER TABLE daily_incomes
ADD CONSTRAINT daily_incomes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 3. expenses
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

ALTER TABLE expenses
ADD CONSTRAINT expenses_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 4. fund_transfers
ALTER TABLE fund_transfers
DROP CONSTRAINT IF EXISTS fund_transfers_user_id_fkey;

ALTER TABLE fund_transfers
ADD CONSTRAINT fund_transfers_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 5. other_incomes (Refs auth.users usually, but checking)
ALTER TABLE other_incomes
DROP CONSTRAINT IF EXISTS other_incomes_user_id_fkey;

ALTER TABLE other_incomes
ADD CONSTRAINT other_incomes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Verify
SELECT 
    tc.table_name, 
    rc.delete_rule 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.referential_constraints AS rc 
    ON tc.constraint_name = rc.constraint_name 
WHERE 
    tc.constraint_type = 'FOREIGN KEY';
