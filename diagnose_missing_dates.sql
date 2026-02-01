-- DIAGNOSE SPECIFIC DATES (19, 20, 21)
-- Run this to see exactly what is stored for these days.

-- 1. Check ALL rows for these dates (ignoring user_id filter if possible, or just checking what is visible)
SELECT 
    id,
    date, 
    total_calculated, 
    total_facturas, 
    total_boletas, 
    user_id,
    created_at
FROM daily_incomes
WHERE date IN ('2026-01-19', '2026-01-20', '2026-01-21', '2026-01-22', '2026-01-23');

-- 2. Check if there are "Other Incomes" for these days
SELECT * FROM other_incomes
WHERE date IN ('2026-01-19', '2026-01-20', '2026-01-21');

-- 3. Check my own User ID (to compare)
SELECT auth.uid() as my_user_id;
