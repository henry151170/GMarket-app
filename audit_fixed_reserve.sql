-- Audit Query: Suggested Reserve Calculation
-- The system calculates this as: (Sum of 'Fixed' expenses in last 90 days) / 3

-- 1. List all Fixed Expenses from the last 90 days
SELECT 
    date as Fecha,
    category as Categoría,
    description as Descripción,
    amount as Monto
FROM expenses
WHERE is_fixed = true
  AND date >= (CURRENT_DATE - INTERVAL '90 days')
ORDER BY date DESC;

-- 2. Calculate the Average
SELECT 
    SUM(amount) as "Total Gastos Fijos (90 días)",
    ROUND(SUM(amount) / 3, 2) as "Reserva Sugerida (Promedio Mensual)"
FROM expenses
WHERE is_fixed = true
  AND date >= (CURRENT_DATE - INTERVAL '90 days');
