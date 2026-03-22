-- DEBUG SCRIPT V2: Test UPDATE Trigger Behavior
BEGIN;

DO $$
DECLARE
    income_id uuid;
    user_id uuid;
    initial_notas numeric := 100.00;
    updated_notas numeric := 200.00; -- Change value in update
    yape_amount numeric := 50.00;
    final_notas numeric;
BEGIN
    SELECT id INTO user_id FROM auth.users LIMIT 1;
    IF user_id IS NULL THEN RAISE EXCEPTION 'No user found'; END IF;

    -- 1. Insert
    INSERT INTO public.daily_incomes (date, total_facturas, total_boletas, total_notas_venta, user_id)
    VALUES ('2030-01-01', 0, 0, initial_notas, user_id)
    RETURNING id INTO income_id;

    -- 2. Update (Simulate saving edit form)
    UPDATE public.daily_incomes 
    SET total_notas_venta = updated_notas
    WHERE id = income_id;

    -- 3. Check Value
    SELECT total_notas_venta INTO final_notas FROM public.daily_incomes WHERE id = income_id;

    RAISE NOTICE 'Updated Notas Expected: %', updated_notas;
    RAISE NOTICE 'Updated Notas Actual: %', final_notas;

    IF final_notas != updated_notas THEN
        RAISE EXCEPTION '❌ FAILURE ON UPDATE: Value changed to %', final_notas;
    ELSE
        RAISE NOTICE '✅ SUCCESS: UPDATE integrity OK.';
    END IF;

    -- Cleanup
    DELETE FROM public.daily_incomes WHERE id = income_id;
END $$;
ROLLBACK;
