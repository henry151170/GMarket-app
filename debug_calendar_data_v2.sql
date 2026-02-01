-- DEBUG V2: Inspect Calendar Data (Corrected Table Names)
-- Run this in SQL Editor

-- 1. Check Daily Incomes (Ventas del día)
SELECT 
    count(*) as total_rows, 
    max(date) as last_income_date,
    min(date) as first_income_date
FROM daily_incomes;

-- 2. See the last 5 entries of Daily Incomes
SELECT date, total_calculated, user_id, created_at
FROM daily_incomes
ORDER BY date DESC
LIMIT 5;

-- 3. Check Other Incomes
SELECT 
    count(*) as total_other_rows, 
    max(date) as last_other_date
FROM other_incomes;

-- 4. Check Cash Journal (to see if money entered system differently)
SELECT count(*) as journal_rows, max(date) as last_journal_date
FROM cash_journal
WHERE type = 'income';
