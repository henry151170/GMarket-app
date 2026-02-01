-- FIX OWNERSHIP (V4)
-- This script looks for the user currently using the system (based on the record from Jan 21)
-- and assigns ALL history to that user.

DO $$
DECLARE
    correct_user_id uuid;
BEGIN
    -- 1. Find the User ID from the visible record (Jan 21)
    SELECT user_id INTO correct_user_id 
    FROM daily_incomes 
    WHERE date = '2026-01-21' 
    LIMIT 1;

    -- 2. If we found a user, update everything else to match
    IF correct_user_id IS NOT NULL THEN
        
        -- Fix Daily Incomes (Ventas)
        UPDATE daily_incomes 
        SET user_id = correct_user_id 
        WHERE user_id IS DISTINCT FROM correct_user_id;

        -- Fix Other Incomes
        UPDATE other_incomes 
        SET user_id = correct_user_id 
        WHERE user_id IS DISTINCT FROM correct_user_id;

        -- Fix Expenses (just in case)
        UPDATE expenses 
        SET user_id = correct_user_id 
        WHERE user_id IS DISTINCT FROM correct_user_id;

        RAISE NOTICE '¡Éxito! Se han unificado todos los registros al usuario: %', correct_user_id;
    ELSE
        RAISE EXCEPTION 'No se encontró el registro del 21 de enero para tomar el ID de referencia.';
    END IF;
END $$;
