-- MIGRATION: Setup Transfer Journaling with Multi-Currency Support

-- 1. Create Trigger Function
CREATE OR REPLACE FUNCTION log_transfer_to_journal() RETURNS TRIGGER AS $$
DECLARE
  dest_amount numeric;
  rate numeric;
BEGIN
  rate := COALESCE(NEW.exchange_rate, 1);
  
  -- Calculate Destination Amount based on Currency Direction
  -- Assume Rate is always PEN per USD (e.g. 3.75)
  
  IF NEW.currency_origin = NEW.currency_destination THEN
      dest_amount := NEW.amount;
  ELSIF NEW.currency_origin = 'USD' AND NEW.currency_destination = 'PEN' THEN
      -- Selling USD (100 USD * 3.75 = 375 PEN)
      dest_amount := NEW.amount * rate;
  ELSIF NEW.currency_origin = 'PEN' AND NEW.currency_destination = 'USD' THEN
      -- Buying USD (375 PEN / 3.75 = 100 USD)
      dest_amount := NEW.amount / NULLIF(rate, 0);
  ELSE
      -- Fallback
      dest_amount := NEW.amount;
  END IF;

  -- 1. DEBIT Origin (Outflow)
  -- If Origin is Hand (Caja) or Bank, create a negative entry.
  INSERT INTO cash_journal (date, location, amount, type, reference_id, description, currency)
  VALUES (
      NEW.created_at, 
      NEW.origin::cash_location, 
      -NEW.amount, 
      'transfer_out', 
      NEW.id, 
      'Transferencia Enviada: ' || NEW.description,
      NEW.currency_origin
  );

  -- 2. CREDIT Destination (Inflow)
  INSERT INTO cash_journal (date, location, amount, type, reference_id, description, currency)
  VALUES (
      NEW.created_at, 
      NEW.destination::cash_location, 
      dest_amount, 
      'transfer_in', 
      NEW.id, 
      'Transferencia Recibida: ' || NEW.description,
      NEW.currency_destination
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS tr_transfer_journal ON fund_transfers;
CREATE TRIGGER tr_transfer_journal
AFTER INSERT ON fund_transfers
FOR EACH ROW
EXECUTE FUNCTION log_transfer_to_journal();

-- 3. Safety: Ensure no data exists pending (already checked, table is empty)
