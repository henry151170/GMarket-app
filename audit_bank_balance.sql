-- Audit Query: Breakdown of Bank Balance (S/ 10,865.38)

SELECT 
    type as "Tipo de Movimiento",
    description as "Descripción / Método",
    SUM(amount) as "Total Parcial"
FROM cash_journal
WHERE location = 'bank'
GROUP BY type, description
ORDER BY type, SUM(amount) DESC;

-- Grand Total Verification
SELECT 
    'SALDO TOTAL BANCO' as concept,
    SUM(amount) as total
FROM cash_journal
WHERE location = 'bank';
