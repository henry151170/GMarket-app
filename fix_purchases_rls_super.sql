-- ============================================================================
-- SUPER FIX: RLS FOR PURCHASES (GMARKET, SAFRI, GEEKSHOP)
-- Grants explicit permissions so Workers can INSERT and MANAGE their purchases
-- ============================================================================

-- 1. PURCHASES TABLE
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Delete old policies to avoid conflicts
DROP POLICY IF EXISTS "Users manage own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users delete own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users view own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins view all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins manage all purchases" ON public.purchases;

-- Create robust worker policy
CREATE POLICY "Users manage own purchases" ON public.purchases
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create robust admin policy
CREATE POLICY "Admins manage all purchases" ON public.purchases
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. PURCHASE_ITEMS TABLE
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own items" ON public.purchase_items;
DROP POLICY IF EXISTS "Users delete own items" ON public.purchase_items;

CREATE POLICY "Users manage own items" ON public.purchase_items
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. CASH_JOURNAL TABLE (For triggers)
ALTER TABLE public.cash_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Authenticated Journal" ON public.cash_journal;

CREATE POLICY "Allow All Authenticated Journal" ON public.cash_journal
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Reload schema to apply
NOTIFY pgrst, 'reload schema';
