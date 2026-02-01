-- CLEANUP SCRIPT: Remove "ghost" entries from the Cash Journal
-- This fixes the issue where deleted records still appear in the balance.

-- 1. Remove Purchases that no longer exist in the 'purchases' table
DELETE FROM cash_journal
WHERE type = 'purchase'
  AND reference_id NOT IN (SELECT id FROM purchases);

-- 2. Remove Other Incomes that no longer exist in 'other_incomes'
DELETE FROM cash_journal
WHERE type = 'other_income'
  AND reference_id NOT IN (SELECT id FROM other_incomes);

-- 3. Remove Expenses that no longer exist (Safety check)
DELETE FROM cash_journal
WHERE type = 'expense'
  AND reference_id NOT IN (SELECT id FROM expenses);

-- 4. Remove Incomes that no longer exist (Safety check)
DELETE FROM cash_journal
WHERE type = 'income'
  AND reference_id NOT IN (SELECT id FROM income_payments);
