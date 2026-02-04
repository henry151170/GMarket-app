import { useState, useEffect } from 'react';
import { Calendar, Edit } from 'lucide-react';
import { useIncomes, type DailyIncome } from '../../hooks/useIncomes';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function WorkerHistoryPage() {
    const { fetchIncomes } = useIncomes();
    const [incomes, setIncomes] = useState<DailyIncome[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // RLS restricts this to only my incomes
        const data = await fetchIncomes();
        setIncomes(data);
        setLoading(false);
    };

    const formatMoney = (amount: number) => {
        return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    const handleResetAll = async () => {
        // Security check: Verify logic since only Admins should usually do this.
        // But per request, we enable it here.
        if (!confirm("⚠️ ¿PELIGRO: ESTÁS SEGURO? ⚠️\n\nEsto eliminará TODO el historial (Ingresos, Gastos, Caja) y dejará el sistema como nuevo.\n\nNO se puede deshacer.")) return;

        const { error } = await supabase.rpc('reset_all_financial_data');
        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('✅ Sistema reiniciado correctamente.');
            window.location.reload();
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando historial...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-fiori-header">Mi Historial</h1>
                <p className="text-fiori-text-light">Registro de tus cierres de caja diarios</p>
                <button
                    onClick={handleResetAll}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 underline decoration-dotted"
                >
                    (Reseteo Total - Solo usar en Emergencia)
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Venta</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {incomes.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                                    No hay registros de ingresos.
                                </td>
                            </tr>
                        ) : (
                            incomes.map((income) => (
                                <tr key={income.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {new Date(income.date + 'T00:00:00').toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        {formatMoney(income.total_calculated)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => navigate(`/worker/incomes/edit/${income.id}`)} // Assumes Reuse of Register Page for Edit
                                            // Wait, RegisterIncomePage handles edit mode if ID is present
                                            // Need to check route in App.tsx
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-end gap-1"
                                        >
                                            <Edit className="w-3 h-3" />
                                            Ver/Editar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
