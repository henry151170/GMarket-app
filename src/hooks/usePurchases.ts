
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PurchaseItem {
    id?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface Purchase {
    id: string;
    supplier_id: string | null;
    date: string;
    total_amount: number;
    payment_method: 'cash' | 'yape' | 'card' | 'transfer';
    status: 'pending' | 'completed' | 'cancelled';
    notes?: string;
    created_at: string;
    suppliers?: {
        name: string;
    };
    purchase_items?: PurchaseItem[];
}

export interface PurchaseFormData {
    supplier_id: string;
    date: string;
    payment_method: string;
    notes?: string;
    items: Omit<PurchaseItem, 'total_price'>[];
}

export function usePurchases() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createPurchase = async (data: PurchaseFormData) => {
        setLoading(true);
        setError(null);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('No usuario autenticado');

            // 1. Calculate Total
            const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            // 2. Insert Purchase Header
            const { data: purchase, error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                    supplier_id: data.supplier_id || null, // Handle empty string as null
                    user_id: user.id,
                    date: data.date,
                    total_amount: totalAmount,
                    payment_method: data.payment_method,
                    status: 'completed', // Default for now
                    notes: data.notes
                })
                .select()
                .single();

            if (purchaseError) throw purchaseError;
            if (!purchase) throw new Error('Error creating purchase record');

            // 3. Insert Items
            const itemsToInsert = data.items.map(item => ({
                purchase_id: purchase.id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price
            }));

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return true;
        } catch (err: any) {
            console.error('Error creating purchase:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deletePurchase = async (id: string) => {
        try {
            setLoading(true);
            const { error } = await supabase.from('purchases').delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error deleting purchase:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const getPurchaseById = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    suppliers (id, name),
                    purchase_items (*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            console.error('Error getting purchase:', err);
            return null;
        }
    };

    const updatePurchase = async (id: string, data: PurchaseFormData) => {
        setLoading(true);
        setError(null);
        try {
            // 1. Calculate Total
            const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            // 2. Update Header
            const { error: updateError } = await supabase
                .from('purchases')
                .update({
                    supplier_id: data.supplier_id || null, // Handle empty string as null
                    date: data.date,
                    total_amount: totalAmount,
                    payment_method: data.payment_method,
                    notes: data.notes
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 3. Replace Items (Delete all and re-insert)
            const { error: deleteError } = await supabase
                .from('purchase_items')
                .delete()
                .eq('purchase_id', id);

            if (deleteError) throw deleteError;

            const itemsToInsert = data.items.map(item => ({
                purchase_id: id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price
            }));

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return true;
        } catch (err: any) {
            console.error('Error updating purchase:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    suppliers (name),
                    purchase_items (*)
                `)
                .order('date', { ascending: false });

            if (error) throw error;
            return data as Purchase[];
        } catch (err: any) {
            console.error('Error fetching purchases:', err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    };

    return {
        createPurchase,
        fetchPurchases,
        deletePurchase,
        getPurchaseById,
        updatePurchase,
        loading,
        error
    };
}
