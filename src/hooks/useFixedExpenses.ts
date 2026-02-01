
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface FixedExpenseTemplate {
    id: string;
    title: string;
    amount: number;
    currency?: 'PEN' | 'USD';
    category: string;
    day_of_month: number;
}

export function useFixedExpenses() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('fixed_expense_templates')
                .select('*')
                .order('day_of_month', { ascending: true });

            if (error) throw error;
            return data as FixedExpenseTemplate[];
        } catch (err: any) {
            console.error('Error fetching templates:', err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const createTemplate = async (template: Omit<FixedExpenseTemplate, 'id'>) => {
        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('No user');

            const { error } = await supabase
                .from('fixed_expense_templates')
                .insert({ ...template, user_id: user.id });

            if (error) throw error;
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteTemplate = async (id: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('fixed_expense_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Helper to generate pending expenses for a given month
    const generateExpensesForPeriod = async (month: number, year: number) => {
        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('No user');

            // Fetch current templates to be sure we have latest
            const { data: templates, error: fetchError } = await supabase
                .from('fixed_expense_templates')
                .select('*');

            if (fetchError) throw fetchError;
            if (!templates || templates.length === 0) return { success: true, count: 0 };

            const expensesToInsert = templates.map(t => {
                // Construct date: YYYY-MM-DD
                // Handle days like 31 in Feb -> default to last day of month
                const targetDate = new Date(year, month - 1, t.day_of_month);
                // Adjust if month rolled over (e.g. Feb 30 -> Mar 2)
                if (targetDate.getMonth() !== month - 1) {
                    // Set to last day of intended month
                    targetDate.setDate(0);
                }

                return {
                    category: t.category,
                    description: t.title,
                    amount: t.amount,
                    currency: t.currency || 'PEN',
                    date: targetDate.toLocaleDateString('en-CA'),
                    payment_method: 'cash', // Default placeholder, user must update when paid
                    cash_location: 'hand',
                    is_fixed: true,
                    status: 'pending', // Always pending initially so user confirms payment
                    template_id: t.id,
                    user_id: user.id
                };
            });

            const { error } = await supabase
                .from('expenses')
                .insert(expensesToInsert);

            if (error) throw error;
            return { success: true, count: expensesToInsert.length };
        } catch (err: any) {
            setError(err.message);
            return { success: false, count: 0 };
        } finally {
            setLoading(false);
        }
    };

    return {
        fetchTemplates,
        createTemplate,
        deleteTemplate,
        generateExpensesForPeriod,
        loading,
        error
    };
}
