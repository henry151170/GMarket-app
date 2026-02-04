
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, DollarSign, FileText, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIncomes } from '../../hooks/useIncomes';

interface DailyIncome {
    id: string;
    date: string;
    total_facturas: number;
    total_boletas: number;
    total_notas_venta: number;
    total_cost: number;
    created_at: string;
    profiles: {
        full_name: string;
    };
    income_payments: {
        amount: number;
        method: string;
    }[];
}

export default function IncomesPage() {
    const navigate = useNavigate();
    const { deleteIncome } = useIncomes();
    const [incomes, setIncomes] = useState<DailyIncome[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Está seguro de eliminar este ingreso? Esta acción no se puede deshacer.')) {
            try {
                await deleteIncome(id);
                // Refresh list
                fetchIncomes();
            } catch (error) {
                alert('Error al eliminar');
            }
        }
    };

    const handleResetAll = async () => {
        if (!confirm("⚠️ ¿PELIGRO: ESTÁS SEGURO? ⚠️\n\nEsto eliminará TODO el historial (Ingresos, Gastos, Caja) y dejará el sistema como nuevo.\n\nNO se puede deshacer.")) return;

        const { error } = await supabase.rpc('reset_all_financial_data');
        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('✅ Sistema reiniciado correctamente.');
            window.location.reload();
        }
    };

    useEffect(() => {
        fetchIncomes();
    }, []);

    const fetchIncomes = async () => {
        try {
            // Simplified query first to test
            const { data, error } = await supabase
                .from('daily_incomes')
                .select(`
                        *,
                        profiles (full_name),
                        income_payments (
                            amount,
                            method
                        )
                    `)
                .order('date', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            console.log('Data fetched:', data);
            setIncomes(data || []);
        } catch (error: any) {
            console.error('Error fetching incomes:', error);
            // Set empty array on error to avoid crash defined map on undefined
            setIncomes([]);
            // Optional: set visual error state
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const calculateTotal = (income: DailyIncome) => {
        return income.total_facturas + income.total_boletas + income.total_notas_venta;
    };

    const getPaymentMethodName = (method: string) => {
        const names: Record<string, string> = {
            cash: 'Efectivo',
            yape: 'Yape',
            card: 'Tarjeta',
            transfer: 'Transferencia'
        };
        return names[method] || method;
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-fiori-blue border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-fiori-header">Historial de Ingresos</h1>
                    <p className="text-fiori-text-light">Registro diario de ventas, costo y utilidad</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleResetAll}
                        className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-md hover:bg-red-100 transition-colors border border-red-200"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Reseteo Total</span>
                    </button>
                    <a href="/admin/incomes/new" className="flex items-center gap-2 bg-fiori-blue text-white px-4 py-2 rounded-md hover:bg-fiori-blue-dark transition-colors shadow-sm">
                        <DollarSign className="w-5 h-5" />
                        <span>Nuevo Ingreso</span>
                    </a>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="w-10 px-6 py-4"></th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registrado Por</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Venta</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Costo</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilidad</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {incomes.map((income) => {
                            const totalVenta = calculateTotal(income);
                            const utilidad = totalVenta - (income.total_cost || 0);
                            return (
                                <React.Fragment key={income.id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-400 cursor-pointer" onClick={() => toggleRow(income.id)}>
                                            {expandedRows.has(income.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </td>
                                        <td className="px-6 py-4 cursor-pointer" onClick={() => toggleRow(income.id)}>
                                            <div className="flex items-center gap-2 font-medium text-gray-900">
                                                <Calendar className="w-4 h-4 text-fiori-blue" />
                                                {new Date(income.date + 'T00:00:00').toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{income.profiles?.full_name}</td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">S/ {totalVenta.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">S/ {(income.total_cost || 0).toFixed(2)}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            S/ {utilidad.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/admin/incomes/edit/${income.id}`)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(income.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.has(income.id) && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="ml-10 bg-white rounded-md border border-gray-100 p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                <FileText className="w-4 h-4" />
                                                                Desglose de Comprobantes
                                                            </h4>
                                                            <div className="space-y-2 text-sm text-gray-600">
                                                                <div className="flex justify-between border-b pb-1">
                                                                    <span>Facturas:</span>
                                                                    <span>S/ {income.total_facturas.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b pb-1">
                                                                    <span>Boletas:</span>
                                                                    <span>S/ {income.total_boletas.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b pb-1">
                                                                    <span>Notas de Venta:</span>
                                                                    <span>S/ {income.total_notas_venta.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                <DollarSign className="w-4 h-4" />
                                                                Desglose de Pagos
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {income.income_payments?.map((payment, idx) => (
                                                                    <div key={idx} className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                                                                        <div className="text-xs text-gray-500 uppercase mb-0.5">{getPaymentMethodName(payment.method)}</div>
                                                                        <div className="font-semibold text-gray-900">S/ {payment.amount.toFixed(2)}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
