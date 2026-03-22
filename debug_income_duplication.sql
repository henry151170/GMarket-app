-- DEBUG SCRIPT: Test Income Insertion and Trigger Behavior
-- Simulates the user flow: Insert Income -> Insert Payments -> Check Values

BEGIN;

-- 1. Create a dummy user for testing
DO $$
DECLARE
    test_user_id uuid;
    income_id uuid;
    initial_notas numeric := 100.00;
    yape_amount numeric := 50.00;
    card_amount numeric := 50.00;
    final_notas numeric;
BEGIN
    RAISE NOTICE '--- INICIANDO PRUEBA DE DEBUG ---';

    -- Get first avail user or create temp
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No user found, creating dummy not possible in this block easily without auth.users access permissions. Skipping.';
        RETURN;
    END IF;

    RAISE NOTICE 'Test User ID: %', test_user_id;

    -- 2. Insert Daily Income (Simulate Frontend Register)
    INSERT INTO public.daily_incomes (
        date, 
        total_facturas, 
        total_boletas, 
        total_notas_venta, 
        user_id
    ) VALUES (
        '2030-01-01', -- Future date to avoid conflicts
        0, 
        0, 
        initial_notas, 
        test_user_id
    ) RETURNING id INTO income_id;

    RAISE NOTICE 'Income ID Created: %', income_id;

    -- 3. Insert Payments (Yape & Card)
    INSERT INTO public.income_payments (daily_income_id, method, amount)
    VALUES (income_id, 'yape', yape_amount);

    INSERT INTO public.income_payments (daily_income_id, method, amount)
    VALUES (income_id, 'card', card_amount);

    -- 4. Check if Triggers modified the parent daily_incomes table
    SELECT total_notas_venta INTO final_notas FROM public.daily_incomes WHERE id = income_id;

    RAISE NOTICE '--- RESULTADOS ---';
    RAISE NOTICE 'Notas Iniciales (Insertadas): %', initial_notas;
    RAISE NOTICE 'Notas Finales (Tras pagos): %', final_notas;
    RAISE NOTICE 'Pagos Insertados: Yape=%, Card=%', yape_amount, card_amount;

    IF final_notas != initial_notas THEN
        RAISE EXCEPTION '❌ FAILURE: El campo total_notas_venta cambió de % a %. ¡Hay un trigger modificando datos!', initial_notas, final_notas;
    ELSE
        RAISE NOTICE '✅ SUCCESS: Database integrity OK. total_notas_venta se mantuvo intacto.';
    END IF;

    -- 5. Cleanup
    -- Rollback everything to not pollute DB, but for this script we want to see output. 
    -- We'll force an error at the end to rollback if we were in a transaction, 
    -- but "DO" block implies transaction. 
    -- To safe clean up:
    DELETE FROM public.daily_incomes WHERE id = income_id;
    
END $$;

ROLLBACK; -- Always rollback changes
