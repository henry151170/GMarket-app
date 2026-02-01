-- AUTO-DELETE TRIGGERS
-- Creates triggers to automatically remove cash_journal entries when the source record is deleted.

-- 1. Generic Delete Function
CREATE OR REPLACE FUNCTION handle_journal_deletion() RETURNS TRIGGER AS $$
DECLARE
  journal_type text;
BEGIN
  -- We pass the journal 'type' as the first argument to the trigger
  journal_type := TG_ARGV[0];
  
  IF journal_type IS NOT NULL THEN
    DELETE FROM cash_journal
    WHERE reference_id = OLD.id
      AND type = journal_type;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger for EXPENSES
DROP TRIGGER IF EXISTS tr_delete_expense_journal ON expenses;
CREATE TRIGGER tr_delete_expense_journal
AFTER DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION handle_journal_deletion('expense');

-- 3. Trigger for PURCHASES
DROP TRIGGER IF EXISTS tr_delete_purchase_journal ON purchases;
CREATE TRIGGER tr_delete_purchase_journal
AFTER DELETE ON purchases
FOR EACH ROW
EXECUTE FUNCTION handle_journal_deletion('purchase');

-- 4. Trigger for OTHER INCOMES
DROP TRIGGER IF EXISTS tr_delete_other_income_journal ON other_incomes;
CREATE TRIGGER tr_delete_other_income_journal
AFTER DELETE ON other_incomes
FOR EACH ROW
EXECUTE FUNCTION handle_journal_deletion('other_income');

-- 5. Trigger for INCOME PAYMENTS (Incomes)
-- Note: Journal entries for incomes are linked to 'income_payments' (detail), not the parent 'daily_incomes'.
-- Trigger 'log_income_to_journal' sets type='income' and reference_id=NEW.id (payment id).
DROP TRIGGER IF EXISTS tr_delete_income_payment_journal ON income_payments;
CREATE TRIGGER tr_delete_income_payment_journal
AFTER DELETE ON income_payments
FOR EACH ROW
EXECUTE FUNCTION handle_journal_deletion('income');
