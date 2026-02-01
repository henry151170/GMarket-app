import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface OtherIncome {
    id: string;
    date: string;
    amount: number;
    description: string;
    category?: string;
    user_id: string;
    payment_method: 'cash' | 'yape' | 'card' | 'transfer';
    currency?: 'PEN' | 'USD';
}

export interface OtherIncomeFormData {
    fecha: string;
    monto: number;
    descripcion: string;
    payment_method: 'cash' | 'yape' | 'card' | 'transfer';
    moneda: 'PEN' | 'USD';
}

export function useOtherIncomes() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getOtherIncomes = async (startDate?: string, endDate?: string) => {
        try {
            let query = supabase
                .from('other_incomes')
                .select('*')
                .order('date', { ascending: false });

            if (startDate) query = query.gte('date', startDate);
            if (endDate) query = query.lte('date', endDate);

            const { data, error } = await query;

            if (error) throw error;
            return data as OtherIncome[];
        } catch (err: any) {
            console.error('Error fetching other incomes:', err);
            setError(err.message);
            return [];
        }
    };

    const registerOtherIncome = async (data: OtherIncomeFormData) => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('other_incomes')
                .insert({
                    date: data.fecha,
                    amount: data.monto,
                    description: data.descripcion,
                    payment_method: data.payment_method,
                    user_id: user.id,
                    currency: data.moneda || 'PEN'
                });
            // ...

            if (error) throw error;
        } catch (err: any) {
            console.error('Error registering other income:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteOtherIncome = async (id: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('other_incomes')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        getOtherIncomes,
        registerOtherIncome,
        deleteOtherIncome,
        loading,
        error
    };
}
