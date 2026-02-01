-- DEBUG V3: CHECK USER IDs
-- We suspect the rows for 19 and 20 belong to a different user (or no user).

SELECT 
    date, 
    total_calculated, 
    user_id, 
    created_at
FROM daily_incomes
ORDER BY date DESC
LIMIT 10;
