-- DEBUG: Inspect Daily Incomes View and Data
-- Run this in SQL Editor

-- 1. Check the View Definition
SELECT pg_get_viewdef('daily_incomes', true);

-- 2. Check recent data in the View
SELECT * FROM daily_incomes 
WHERE date >= '2026-01-15' 
ORDER BY date DESC;

-- 3. Check underlying tables (assuming 'sales' or 'documents' - guessing names based on view columns)
-- We'll try to guess likely table names or check if 'incomes' table is involved
SELECT count(*) as count_recent_incomes, max(date) as last_date 
FROM incomes 
WHERE date >= '2026-01-15';

-- If there are other tables like 'sales', 'facturas', etc., we might need to find them first.
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
