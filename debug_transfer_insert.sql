-- Debug Transfer Insertion
-- Try to insert a valid record to see if it fails.

DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Get a valid user (assuming first one)
    SELECT id INTO user_id FROM auth.users LIMIT 1;
    
    INSERT INTO fund_transfers (
        amount, 
        origin, 
        destination, 
        description, 
        user_id, 
        currency_origin, 
        currency_destination, 
        exchange_rate,
        created_at
    ) VALUES (
        100.00, 
        'hand', 
        'bank', 
        'Test Transfer', 
        user_id, 
        'PEN', 
        'USD', 
        3.75,
        NOW()
    );
END $$;
