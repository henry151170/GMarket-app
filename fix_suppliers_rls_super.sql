-- ============================================================================
-- SUPER FIX: RLS FOR SUPPLIERS
-- Grants explicit permissions so any authenticated user (Worker or Admin)
-- can view, create, and manage suppliers.
-- ============================================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users manage own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins manage all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users view own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins view all suppliers" ON public.suppliers;

-- Create robust universal policy for suppliers
CREATE POLICY "Users manage own suppliers" ON public.suppliers
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Reload schema to apply
NOTIFY pgrst, 'reload schema';
