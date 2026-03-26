
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Expense {
    id: string;
    category: 'packaging' | 'cleaning' | 'transport' | 'advertising' | 'maintenance' | 'food' | 'wages' | 'utilities' | 'rent' | 'other';
    description: string;
    amount: number;
    date: string;
    payment_method: 'cash' | 'yape' | 'card' | 'transfer';
    cash_location?: 'hand' | 'bank';
    is_fixed: boolean;
    is_structural: boolean; // New field
    user_id: string;
    created_at: string;
    status: 'paid' | 'pending';
    template_id?: string;
    currency?: 'PEN' | 'USD';
    profiles?: {
        full_name: string;
    };
}

export interface ExpenseFormData {
    category: string;
    description: string;
    amount: number;
    currency?: 'PEN' | 'USD';
    date: string;
    payment_method: string;
    cash_location?: string;
    is_fixed: boolean;
    is_structural?: boolean; // New field
}

export function useExpenses() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createExpense = async (data: ExpenseFormData) => {
        setLoading(true);
        setError(null);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('No usuario autenticado');

            const { error: insertError } = await supabase
                .from('expenses')
                .insert({
                    category: data.category,
                    description: data.description,
                    amount: data.amount,
                    currency: data.currency || 'PEN',
                    date: data.date,
                    payment_method: data.payment_method,
                    cash_location: data.payment_method === 'cash' ? data.cash_location : null,
                    is_fixed: data.is_fixed,
                    user_id: user.id,
                    status: 'paid', // Explicitly set to paid
                    is_structural: data.is_structural ?? false // Default to false
                });

            if (insertError) throw insertError;
            return true;
        } catch (err: any) {
            console.error('Error creating expense:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            setLoading(true);

            // 1. Delete associated cash_journal entry
            const { error: journalError } = await supabase
                .from('cash_journal')
                .delete()
                .eq('reference_id', id)
                .eq('type', 'expense');

            if (journalError) throw journalError;

            // 2. Delete expense
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error deleting expense:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const getExpenseById = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Expense;
        } catch (err: any) {
            console.error('Error getting expense:', err);
            return null;
        }
    };

    const updateExpense = async (id: string, data: ExpenseFormData) => {
        setLoading(true);
        setError(null);
        try {
            const { error: updateError } = await supabase
                .from('expenses')
                .update({
                    category: data.category,
                    description: data.description,
                    amount: data.amount,
                    currency: data.currency || 'PEN',
                    date: data.date,
                    payment_method: data.payment_method,
                    cash_location: data.payment_method === 'cash' ? data.cash_location : null,
                    is_fixed: data.is_fixed,
                    is_structural: data.is_structural ?? false // Update flag
                })
                .eq('id', id);

            if (updateError) throw updateError;

            return true;
        } catch (err: any) {
            console.error('Error updating expense:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };



    const toggleExpenseStatus = async (id: string, newStatus: 'paid' | 'pending') => {
        setLoading(true);
        try {
            // 1. Update status AND force is_structural=true if paying
            // This ensures manual expenses or worker expenses become deductible when approved/paid
            // The DB trigger 'sync_expense_to_journal' will handle the journal entry creation/deletion automatically.
            const updateData: any = { status: newStatus };
            if (newStatus === 'paid') {
                updateData.is_structural = true;
            }

            const { error: updateError } = await supabase
                .from('expenses')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;
            return true;
        } catch (err: any) {
            console.error('Error toggling status:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*, profiles(full_name)')
                .order('date', { ascending: false });

            if (error) throw error;
            return data as Expense[];
        } catch (err: any) {
            console.error('Error fetching expenses:', err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const deleteAllExpenses = async () => {
        setLoading(true);
        try {
            // Priority 1: Try Fast RPC
            const { data, error } = await supabase.rpc('reset_expenses');

            if (!error && data === true) {
                return { success: true };
            }

            console.warn('RPC reset_expenses failed or returned false, trying manual fallback...', error);

            // Priority 2: Manual Fallback (Fetch & Delete)
            const { data: allExpenses, error: fetchError } = await supabase
                .from('expenses')
                .select('id')
                .limit(1000);

            if (fetchError) throw fetchError;

            if (allExpenses && allExpenses.length > 0) {
                // Delete in batches or loops
                const ids = allExpenses.map(e => e.id);

                // Note: Deleteing expenses will trigger the journal deletion automatically via DB triggers
                const { error: deleteError } = await supabase
                    .from('expenses')
                    .delete()
                    .in('id', ids);

                if (deleteError) throw deleteError;
            }

            return { success: true };
        } catch (err: any) {
            console.error('Error resetting expenses:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return {
        createExpense,
        fetchExpenses,
        deleteExpense,
        getExpenseById,

        updateExpense,
        toggleExpenseStatus,
        deleteAllExpenses,
        loading,
        error
    };
}
