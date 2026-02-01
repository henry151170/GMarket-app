-- Detailed Bank Credits Debug
-- Shows EVERY positive entry into the Bank account to find the extra 170 soles.

SELECT 
    date as Fecha,
    type as Tipo,
    description as Descripcion,
    amount as Monto
FROM cash_journal
WHERE location = 'bank'
  AND amount > 0  -- Only money entering the bank
ORDER BY amount DESC; -- Ordered by amount to easily spot 170 or parts of it
