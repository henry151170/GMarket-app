import { createClient } from '@supabase/supabase-js';

// TODO: Add database types
const supabaseUrl = 'https://lvondqchzdrgnwyymlct.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2b25kcWNoemRyZ253eXltbGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzI4NzUsImV4cCI6MjA4MTkwODg3NX0.aeif6_hsEi9tr1Puso7bDF5_n39KlDYgw3Dsp6zr4BM';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
