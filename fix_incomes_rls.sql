-- FIX: COMPLETE RESET OF INCOME POLICIES
-- This ensures that workers can INSERT and immediately SELECT their new income records.

-- 1. Ensure Admin Function (Idempotent)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid()
    and role::text = 'admin'
  );
end;
$$ language plpgsql security definer;

-- ==========================================
-- TABLE: daily_incomes
-- ==========================================

-- Clean old policies
DROP POLICY IF EXISTS "Users can view own incomes" ON daily_incomes;
DROP POLICY IF EXISTS "Admins can view all incomes" ON daily_incomes;
DROP POLICY IF EXISTS "Users can insert own incomes" ON daily_incomes;
DROP POLICY IF EXISTS "Users can update own incomes" ON daily_incomes;
DROP POLICY IF EXISTS "Users can delete own incomes" ON daily_incomes;

-- Create Unified Policies

-- SELECT
CREATE POLICY "View incomes policy" ON daily_incomes
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- INSERT
CREATE POLICY "Insert incomes policy" ON daily_incomes
FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- UPDATE
CREATE POLICY "Update incomes policy" ON daily_incomes
FOR UPDATE USING (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- DELETE
CREATE POLICY "Delete incomes policy" ON daily_incomes
FOR DELETE USING (
  user_id = auth.uid() 
  OR 
  public.is_admin()
);

-- Grants
ALTER TABLE daily_incomes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON daily_incomes TO authenticated;
GRANT ALL ON daily_incomes TO service_role;


-- ==========================================
-- TABLE: income_payments
-- ==========================================

-- Clean old policies
DROP POLICY IF EXISTS "Users can view own payments" ON income_payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON income_payments;
DROP POLICY IF EXISTS "Users can update own payments" ON income_payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON income_payments;

-- Create Unified Policies (Linked to Parent)

-- SELECT
CREATE POLICY "View payments policy" ON income_payments
FOR SELECT USING (
  daily_income_id IN (
    SELECT id FROM daily_incomes WHERE user_id = auth.uid() OR public.is_admin()
  )
);

-- INSERT
CREATE POLICY "Insert payments policy" ON income_payments
FOR INSERT WITH CHECK (
  daily_income_id IN (
    SELECT id FROM daily_incomes WHERE user_id = auth.uid() OR public.is_admin()
  )
);

-- UPDATE
CREATE POLICY "Update payments policy" ON income_payments
FOR UPDATE USING (
  daily_income_id IN (
    SELECT id FROM daily_incomes WHERE user_id = auth.uid() OR public.is_admin()
  )
);

-- DELETE
CREATE POLICY "Delete payments policy" ON income_payments
FOR DELETE USING (
  daily_income_id IN (
    SELECT id FROM daily_incomes WHERE user_id = auth.uid() OR public.is_admin()
  )
);

-- Grants
ALTER TABLE income_payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON income_payments TO authenticated;
GRANT ALL ON income_payments TO service_role;
