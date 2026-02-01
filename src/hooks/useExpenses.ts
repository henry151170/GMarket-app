
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
                    status: 'paid' // Explicitly set to paid
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
            // 1. Delete old cash_journal entry
            // We do this to ensure we don't duplicate or have stale data. 
            // We will re-create it manually after update since triggers don't fire on update.
            await supabase
                .from('cash_journal')
                .delete()
                .eq('reference_id', id)
                .eq('type', 'expense');

            // 2. Update Expense
            const { data: updatedExpense, error: updateError } = await supabase
                .from('expenses')
                .update({
                    category: data.category,
                    description: data.description,
                    amount: data.amount,
                    currency: data.currency || 'PEN',
                    date: data.date,
                    payment_method: data.payment_method,
                    cash_location: data.payment_method === 'cash' ? data.cash_location : null,
                    is_fixed: data.is_fixed
                })
                .eq('id', id)
                .select('status') // Fetch status to be sure
                .single();

            if (updateError) throw updateError;

            // 3. Re-create Cash Journal Entry (ONLY IF PAID)
            // If status is 'pending', we just deleted the old journal (correct) and don't insert a new one (correct).
            if (updatedExpense.status === 'paid') {
                let loc = 'bank';
                if (data.payment_method === 'cash' && data.cash_location) {
                    loc = data.cash_location;
                }

                const { error: journalError } = await supabase
                    .from('cash_journal')
                    .insert({
                        date: data.date,
                        location: loc,
                        amount: -data.amount, // Expense is negative
                        type: 'expense',
                        reference_id: id,
                        description: 'Gasto: ' + data.category,
                        currency: data.currency || 'PEN'
                    });

                if (journalError) throw journalError;
            }

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
            // 1. Update status
            const { error: updateError } = await supabase
                .from('expenses')
                .update({ status: newStatus })
                .eq('id', id);

            if (updateError) throw updateError;

            // 2. Handle Cash Journal Effects
            if (newStatus === 'pending') {
                // Remove from journal (money hasn't left)
                const { error: deleteJournal } = await supabase
                    .from('cash_journal')
                    .delete()
                    .eq('reference_id', id)
                    .eq('type', 'expense');
                if (deleteJournal) throw deleteJournal;
            } else {
                // Add to journal (money paid)
                // Need to fetch details to know amount/location

                // Note: 'expenses' state might not be accessible inside this function if it's not in the closure correctly or stale.
                // Safest to fetch or accept expense object. But user interaction comes from list where we have the object.
                // Let's fetch to be safe and atomic.
                const { data: expense, error: fetchError } = await supabase
                    .from('expenses')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (fetchError || !expense) throw fetchError || new Error("Expense not found");

                let loc = 'bank';
                if (expense.payment_method === 'cash' && expense.cash_location) {
                    loc = expense.cash_location;
                }

                // Check if already exists to avoid double deduction?
                // The delete logic above handles the pending transition.
                // For 'paid', we insert.
                const { error: insertJournal } = await supabase
                    .from('cash_journal')
                    .insert({
                        date: expense.date,
                        location: loc,
                        amount: -expense.amount,
                        type: 'expense',
                        reference_id: id,
                        description: 'Expense: ' + expense.category,
                        currency: expense.currency || 'PEN'
                    });

                if (insertJournal) throw insertJournal;
            }

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
            const { data, error } = await supabase.rpc('reset_expenses');
            if (error) throw error;
            if (data === false) throw new Error('La función de base de datos devolvió false (error interno).');
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
