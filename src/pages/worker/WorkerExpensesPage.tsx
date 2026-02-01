import React, { useEffect, useState } from 'react';
import { Plus, TrendingDown, Calendar, Receipt, X, Pencil, Trash2 } from 'lucide-react';
import { useExpenses, type Expense } from '../../hooks/useExpenses';
import ExpenseForm from '../../components/expenses/ExpenseForm';

export default function WorkerExpensesPage() {
    const { fetchExpenses, deleteExpense } = useExpenses();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchExpenses();
        // RLS will ensure we only get our own expenses
        setExpenses(data);
        setLoading(false);
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        setEditId(null);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Confirma que desea eliminar este gasto?')) {
            await deleteExpense(id);
            loadData();
        }
    };

    const handleEdit = (id: string) => {
        setEditId(id);
        setIsModalOpen(true);
    };

    const getCategoryLabel = (cat: string) => {
        const map: Record<string, string> = {
            'packaging': 'Empaques',
            'cleaning': 'Limpieza',
            'transport': 'Transporte',
            'advertising': 'Publicidad',
            'maintenance': 'Mantenimiento',
            'food': 'Alimentación',
            'wages': 'Salarios',
            'utilities': 'Servicios',
            'rent': 'Alquiler',
            'other': 'Otros'
        };
        return map[cat] || cat;
    };

    if (loading && !expenses.length) {
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
                    <h1 className="text-2xl font-bold text-fiori-header">Mis Gastos</h1>
                    <p className="text-fiori-text-light">Registra tus gastos operativos (transporte, almuerzo, etc.)</p>
                </div>
                <button
                    onClick={() => { setEditId(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Registrar Gasto</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {expenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                    No has registrado gastos aún.
                                </td>
                            </tr>
                        ) : (
                            expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {new Date(expense.date + 'T00:00:00').toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{expense.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            <Receipt className="w-3 h-3" />
                                            {getCategoryLabel(expense.category)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                                        {expense.payment_method}
                                        {expense.payment_method === 'cash' && (
                                            <span className="text-xs text-gray-400 ml-1">
                                                ({expense.cash_location === 'hand' ? 'Caja' : 'Banco'})
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-red-600">
                                        - S/ {expense.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(expense.id)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Editar"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                                {editId ? 'Editar Gasto' : 'Registrar Gasto'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <ExpenseForm
                                onSuccess={handleSuccess}
                                onCancel={() => setIsModalOpen(false)}
                                editId={editId}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
