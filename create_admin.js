
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in environment.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    console.log('Creating user admin@store.com...');

    const { data, error } = await supabase.auth.signUp({
        email: 'gerente@store.com',
        password: 'password123',
        options: {
            data: {
                full_name: 'Admin User',
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created successfully!');
        console.log('ID:', data.user?.id);
        console.log('Email:', data.user?.email);
    }
}

createAdmin();
