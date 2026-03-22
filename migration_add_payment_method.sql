-- Add 'expense_cover' to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'expense_cover';
