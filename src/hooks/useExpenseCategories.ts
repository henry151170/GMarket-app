
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ExpenseCategory {
    id: string;
    name: string;
    is_fixed: boolean;
    user_id: string;
}

const DEFAULT_CATEGORIES = [
    { name: 'Bolsas y Empaques', is_fixed: false },
    { name: 'Limpieza', is_fixed: false },
    { name: 'Transporte / Pasajes', is_fixed: false },
    { name: 'Publicidad', is_fixed: false },
    { name: 'Mantenimiento', is_fixed: false },
    { name: 'Alimentación', is_fixed: false },
    { name: 'Otros Gastos Operativos', is_fixed: false },
    { name: 'Planilla / Salarios', is_fixed: true },
    { name: 'Luz / Agua / Internet', is_fixed: true },
    { name: 'Alquiler', is_fixed: true },
];

export function useExpenseCategories() {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { data, error } = await supabase
                .from('expense_categories')
                .select('*')
                .eq('user_id', user.user.id)
                .order('name');

            if (error) throw error;

            // Seed defaults if empty
            if (!data || data.length === 0) {
                const toInsert = DEFAULT_CATEGORIES.map(c => ({
                    ...c,
                    user_id: user.user.id
                }));
                const { data: seeded, error: seedError } = await supabase
                    .from('expense_categories')
                    .insert(toInsert)
                    .select();

                if (seedError) throw seedError;
                setCategories(seeded || []);
            } else {
                setCategories(data);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const createCategory = async (name: string, is_fixed: boolean) => {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return false;

            const { error } = await supabase
                .from('expense_categories')
                .insert({
                    name,
                    is_fixed,
                    user_id: user.user.id
                });

            if (error) throw error;
            await fetchCategories();
            return true;
        } catch (err) {
            console.error('Error creating category:', err);
            return false;
        }
    };

    const updateCategory = async (id: string, name: string) => {
        try {
            const { error } = await supabase
                .from('expense_categories')
                .update({ name })
                .eq('id', id);

            if (error) throw error;
            await fetchCategories();
            return true;
        } catch (err) {
            console.error('Error updating category:', err);
            return false;
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            const { error } = await supabase
                .from('expense_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchCategories();
            return true;
        } catch (err) {
            console.error('Error deleting category:', err);
            return false;
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return { categories, loading, createCategory, updateCategory, deleteCategory, fetchCategories };
}
