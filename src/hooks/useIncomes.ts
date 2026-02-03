import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { IncomeFormData } from '../lib/schemas';
import type { DailyIncome } from '../types';

export type { DailyIncome };

export function useIncomes() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchIncomes = useCallback(async () => {
        try {
            if (!user) return [];
            setLoading(true);
            const { data, error } = await supabase
                .from('daily_incomes')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            return data as DailyIncome[];
        } catch (err: any) {
            console.error('Error fetching incomes:', err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, [user]);

    const registerIncome = useCallback(async (data: IncomeFormData) => {
        if (!user) throw new Error("No usuario autenticado");

        setLoading(true);
        setError(null);

        try {
            // 1. Insert Daily Income Parent Record
            const { data: incomeData, error: incomeError } = await supabase
                .from('daily_incomes')
                .insert({
                    date: data.fecha,
                    total_facturas: data.totalFacturas,
                    total_boletas: data.totalBoletas,
                    total_notas_venta: data.totalNotas,
                    total_cost: data.totalCosto,
                    user_id: user.id,
                    // Tolerance Fields
                    difference_amount: data.differenceAmount || 0,
                    difference_reason: data.differenceReason,
                    difference_note: data.differenceNote,
                    responsible: data.responsible_person
                })
                .select()
                .single();

            if (incomeError) throw incomeError;

            const incomeId = (incomeData as DailyIncome).id;

            // 2. Prepare Payments Data
            const paymentsToInsert = [];

            if (data.pagos.efectivo > 0) {
                paymentsToInsert.push({
                    daily_income_id: incomeId,
                    method: 'cash',
                    amount: data.pagos.efectivo,
                    cash_location: data.pagos.efectivoUbicacion,
                });
            }
            if (data.pagos.yape > 0) {
                paymentsToInsert.push({
                    daily_income_id: incomeId,
                    method: 'yape',
                    amount: data.pagos.yape,
                });
            }
            if (data.pagos.tarjeta > 0) {
                paymentsToInsert.push({
                    daily_income_id: incomeId,
                    method: 'card',
                    amount: data.pagos.tarjeta,
                });
            }
            if (data.pagos.transferencia > 0) {
                paymentsToInsert.push({
                    daily_income_id: incomeId,
                    method: 'transfer',
                    amount: data.pagos.transferencia,
                });
            }

            // 3. Insert Payments
            if (paymentsToInsert.length > 0) {
                const { error: paymentsError } = await supabase
                    .from('income_payments')
                    .insert(paymentsToInsert);

                if (paymentsError) {
                    // Verify if we should rollback parent? Supabase JS doesn't do transactions easily.
                    // For now, throw and let the user know. Ideally we'd use an RPC for atomicity.
                    console.error("Error saving payments", paymentsError);
                    throw new Error("Se guardaron los totales pero hubo error al guardar los detalles de pago. Contacte soporte.");
                }
            }

            return incomeData;

        } catch (err: any) {
            console.error(err);
            if (err.code === '23505') {
                throw new Error("Ya existe un ingreso registrado para esta fecha. Ve al Historial para editarlo.");
            }
            setError(err.message || "Error al registrar ingreso");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user]);

    const deleteIncome = useCallback(async (id: string) => {
        try {
            setLoading(true);

            // 1. Get payments to clean up journal
            const { data: payments } = await supabase
                .from('income_payments')
                .select('id')
                .eq('daily_income_id', id);

            if (payments && payments.length > 0) {
                const paymentIds = payments.map(p => p.id);
                await supabase
                    .from('cash_journal')
                    .delete()
                    .in('reference_id', paymentIds);
            }

            // 2. Delete Income (Cascades to payments)
            const { error } = await supabase
                .from('daily_incomes')
                .delete()
                .eq('id', id);

            if (error) throw error;

        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getIncomeById = useCallback(async (id: string) => {
        const { data, error } = await supabase
            .from('daily_incomes')
            .select(`
                *,
                income_payments (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }, []);

    const updateIncome = useCallback(async (id: string, data: IncomeFormData) => {
        try {
            setLoading(true);

            // For simplicity in this specialized app: Delete payments and recreate them
            // This ensures logic for totals/locations remains consistent without complex diffing

            // 1. Delete old payments (and their journal entries manually first)
            const { data: oldPayments } = await supabase
                .from('income_payments')
                .select('id')
                .eq('daily_income_id', id);

            if (oldPayments?.length) {
                const oldIds = oldPayments.map(p => p.id);
                await supabase.from('cash_journal').delete().in('reference_id', oldIds);
                await supabase.from('income_payments').delete().eq('daily_income_id', id);
            }

            // 2. Update Parent
            const { error: updateError } = await supabase
                .from('daily_incomes')
                .update({
                    date: data.fecha,
                    total_facturas: data.totalFacturas,
                    total_boletas: data.totalBoletas,
                    total_notas_venta: data.totalNotas,
                    total_cost: data.totalCosto,
                    // Tolerance Fields
                    difference_amount: data.differenceAmount || 0,
                    difference_reason: data.differenceReason,
                    difference_note: data.differenceNote,
                    responsible: data.responsible_person
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 3. Insert New Payments (Logic copied from register)
            // ... (Reuse logic or refactor? Copying is safer for now to avoid breaking register)
            const paymentsToInsert = [];
            if (data.pagos.efectivo > 0) paymentsToInsert.push({ daily_income_id: id, method: 'cash', amount: data.pagos.efectivo, cash_location: data.pagos.efectivoUbicacion });
            if (data.pagos.yape > 0) paymentsToInsert.push({ daily_income_id: id, method: 'yape', amount: data.pagos.yape });
            if (data.pagos.tarjeta > 0) paymentsToInsert.push({ daily_income_id: id, method: 'card', amount: data.pagos.tarjeta });
            if (data.pagos.transferencia > 0) paymentsToInsert.push({ daily_income_id: id, method: 'transfer', amount: data.pagos.transferencia });

            if (paymentsToInsert.length > 0) {
                const { error: paymentsError } = await supabase
                    .from('income_payments')
                    .insert(paymentsToInsert);
                if (paymentsError) throw paymentsError;
            }

        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const checkIncomeExists = useCallback(async (date: string) => {
        if (!user) return false;

        const { data } = await supabase
            .from('daily_incomes')
            .select('id')
            .eq('date', date)
            .eq('user_id', user.id)
            .maybeSingle();

        return !!data;
    }, [user]);

    return {
        fetchIncomes,
        registerIncome,
        checkIncomeExists,
        deleteIncome,
        getIncomeById,
        updateIncome,
        loading,
        error
    };
}
