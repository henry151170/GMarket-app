-- Investigative Query: Find "Cash" incomes that went to "Bank"
-- This explains the difference between (Yape+Card) and Total Bank Balance.

SELECT 
    id,
    date,
    description,
    amount,
    location
FROM cash_journal
WHERE location = 'bank' 
  AND description LIKE '%cash%'
ORDER BY date DESC;

-- Also check specifically for the amount difference (170)
SELECT * FROM cash_journal WHERE amount = 170;
