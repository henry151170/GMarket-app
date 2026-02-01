
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ExpenseConcept {
    id: string;
    name: string;
    user_id: string;
}

const DEFAULT_CONCEPTS = [
    { name: 'Alquiler Local' },
    { name: 'Luz del Sur' },
    { name: 'Sedapal' },
    { name: 'Internet' },
    { name: 'Planilla' },
    { name: 'Mantenimiento' },
];

export function useExpenseConcepts() {
    const [concepts, setConcepts] = useState<ExpenseConcept[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConcepts = async () => {
        setLoading(true);
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { data, error } = await supabase
                .from('expense_concepts')
                .select('*')
                .eq('user_id', user.user.id)
                .order('name');

            if (error) throw error;

            // Seed defaults if empty
            if (!data || data.length === 0) {
                const toInsert = DEFAULT_CONCEPTS.map(c => ({
                    ...c,
                    user_id: user.user.id
                }));
                const { data: seeded, error: seedError } = await supabase
                    .from('expense_concepts')
                    .insert(toInsert)
                    .select();

                if (seedError) throw seedError;
                setConcepts(seeded || []);
            } else {
                setConcepts(data);
            }
        } catch (err) {
            console.error('Error fetching concepts:', err);
        } finally {
            setLoading(false);
        }
    };

    const createConcept = async (name: string) => {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return false;

            const { error } = await supabase
                .from('expense_concepts')
                .insert({
                    name,
                    user_id: user.user.id
                });

            if (error) throw error;
            await fetchConcepts();
            return true;
        } catch (err) {
            console.error('Error creating concept:', err);
            return false;
        }
    };

    const updateConcept = async (id: string, name: string) => {
        try {
            const { error } = await supabase
                .from('expense_concepts')
                .update({ name })
                .eq('id', id);

            if (error) throw error;
            await fetchConcepts();
            return true;
        } catch (err) {
            console.error('Error updating concept:', err);
            return false;
        }
    };

    const deleteConcept = async (id: string) => {
        try {
            const { error } = await supabase
                .from('expense_concepts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchConcepts();
            return true;
        } catch (err) {
            console.error('Error deleting concept:', err);
            return false;
        }
    };

    useEffect(() => {
        fetchConcepts();
    }, []);

    return { concepts, loading, createConcept, updateConcept, deleteConcept, fetchConcepts };
}
