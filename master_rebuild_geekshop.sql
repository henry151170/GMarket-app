-- ============================================================================
-- GEEKSHOP MASTER REBUILD: CASH JOURNAL
-- ============================================================================
-- EJECUTAR EN EL PROYECTO GEEKSHOP
-- ============================================================================
-- ATTENTION: This script effectively resets the cash_journal to match the 
-- reality of the source tables (income_payments, expenses, fund_transfers).
-- ============================================================================

BEGIN;

-- 1. TRUNCATE CASH JOURNAL
-- We wipe it clean to avoid duplicates or confusion.
TRUNCATE TABLE public.cash_journal;

-- 2. INSERT INCOMES (From income_payments)
-- Applies 4% Commission Rule: Cash=100%, Bank=96%
INSERT INTO public.cash_journal (
    date, 
    amount, 
    type, 
    description, 
    location, 
    user_id, 
    reference_id, 
    created_at
)
SELECT 
    ip.created_at,
    CASE 
        WHEN ip.method = 'cash' THEN ip.amount 
        ELSE ip.amount * 0.96 -- 4% Commission
    END,
    'income',
    'Ingreso: ' || ip.method,
    CASE 
        WHEN ip.method = 'cash' THEN 'hand'::cash_location 
        ELSE 'bank'::cash_location 
    END,
    di.user_id,
    ip.id,
    ip.created_at
FROM public.income_payments ip
JOIN public.daily_incomes di ON ip.daily_income_id = di.id;


-- 3. INSERT EXPENSES (From expenses)
-- Only 'paid' expenses. Values are NEGATIVE.
INSERT INTO public.cash_journal (
    date, 
    amount, 
    type, 
    description, 
    location, 
    user_id, 
    reference_id, 
    created_at,
    currency
)
SELECT 
    e.date,
    -ABS(e.amount), -- Ensure negative
    'expense',
    'Gasto: ' || e.category,
    CASE 
        WHEN e.payment_method = 'cash' THEN 
             COALESCE(e.cash_location, 'hand')::cash_location
        ELSE 'bank'::cash_location 
    END,
    e.user_id,
    e.id,
    e.created_at,
    e.currency
FROM public.expenses e
WHERE e.status = 'paid';


-- 4. INSERT TRANSFERS (From fund_transfers)
-- Transfers create TWO entries: One OUT (Negative), One IN (Positive)

-- 4.1 OUTGOING (Origin)
INSERT INTO public.cash_journal (
    date, 
    location, 
    amount, 
    type, 
    reference_id, 
    description, 
    user_id,
    created_at
)
SELECT 
    ft.date, 
    ft.origin, 
    -ABS(ft.amount), 
    'transfer_out', 
    ft.id, 
    'Transferencia a ' || ft.destination,
    ft.user_id,
    ft.created_at
FROM public.fund_transfers ft;

-- 4.2 INCOMING (Destination)
INSERT INTO public.cash_journal (
    date, 
    location, 
    amount, 
    type, 
    reference_id, 
    description, 
    user_id,
    created_at
)
SELECT 
    ft.date, 
    ft.destination, 
    ABS(ft.amount), 
    'transfer_in', 
    ft.id, 
    'Transferencia desde ' || ft.origin,
    ft.user_id,
    ft.created_at
FROM public.fund_transfers ft;

-- 5. INSERT OTHER INCOMES (From other_incomes)
-- Usually these are strictly Cash ('hand'), unless updated schema says otherwise.
-- Assuming 'hand' for legacy support, or check if column exists.
-- Using 'hand' as safe default for now as it was 'Otros Ingresos (Caja)'.
INSERT INTO public.cash_journal (
    date, 
    amount, 
    type, 
    description, 
    location, 
    user_id, 
    reference_id, 
    created_at
)
SELECT 
    oi.date,
    oi.amount,
    'other_income',
    COALESCE(oi.description, 'Otro Ingreso'),
    'hand'::cash_location, 
    oi.user_id,
    oi.id,
    oi.created_at
FROM public.other_incomes oi;

COMMIT;

-- 6. NOTIFY
NOTIFY pgrst, 'reload schema';
