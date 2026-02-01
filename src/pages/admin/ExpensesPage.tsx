
import { useState, useEffect } from 'react';
import { Plus, TrendingDown, Calendar, User, X, Pencil, Trash2, List, Clock, Settings } from 'lucide-react';
import { useExpenses, type Expense } from '../../hooks/useExpenses';
import ExpenseForm from '../../components/expenses/ExpenseForm';
import FixedExpensesManager from '../../components/expenses/FixedExpensesManager';
import PendingExpensesList from '../../components/expenses/PendingExpensesList';

export default function ExpensesPage() {
    const { fetchExpenses, deleteExpense, toggleExpenseStatus, deleteAllExpenses } = useExpenses();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'history' | 'pending' | 'templates'>('history');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchExpenses();
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

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
        await toggleExpenseStatus(id, newStatus);
        loadData();
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-fiori-header">Control de Gastos</h1>
                    <p className="text-fiori-text-light">Gestiona salidas de dinero, compras operativas y pagos fijos</p>
                </div>

                {/* TABS */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white text-fiori-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            } flex items-center gap-2`}
                    >
                        <List className="w-4 h-4" /> Historial
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-white text-fiori-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            } flex items-center gap-2`}
                    >
                        <Clock className="w-4 h-4" /> Pendientes
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'templates' ? 'bg-white text-fiori-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            } flex items-center gap-2`}
                    >
                        <Settings className="w-4 h-4" /> Plantillas
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'templates' && (
                <FixedExpensesManager
                    onExpensesGenerated={() => {
                        loadData();
                        setActiveTab('pending'); // Switch to pending view to show new items
                    }}
                />
            )}

            {activeTab === 'pending' && <PendingExpensesList />}

            {activeTab === 'history' && (
                <>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={async () => {
                                if (window.confirm('¡PELIGRO! ¿Estás seguro de que deseas ELIMINAR TODO el historial de gastos?\n\nEsta acción no se puede deshacer y afectará a tu saldo de caja.')) {
                                    try {
                                        const success = await deleteAllExpenses();
                                        if (success) {
                                            alert('Historial de gastos eliminado correctamente.');
                                            window.location.reload(); // Force reload to ensure clean state
                                        } else {
                                            alert('No se pudo eliminar el historial. Revisa la consola o intenta de nuevo.');
                                        }
                                    } catch (e) {
                                        alert('Error al intentar eliminar.');
                                    }
                                }
                            }}
                            className="flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-md hover:bg-red-50 transition-colors shadow-sm"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span>Eliminar Todo</span>
                        </button>
                        <button
                            onClick={() => { setEditId(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Nuevo Gasto</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-lg shadow-card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                            No hay gastos registrados aún.
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
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <User className="w-3 h-3" />
                                                    {expense.profiles?.full_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${expense.is_fixed
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-orange-100 text-orange-800'
                                                    }`}>
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
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(expense.id, expense.status || 'paid')}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${expense.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
                                                        : 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                                        }`}
                                                >
                                                    {expense.status === 'pending' ? 'Pendiente' : 'Pagado'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-red-600">
                                                - {expense.currency === 'USD' ? '$' : 'S/'} {expense.amount.toFixed(2)}
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
                </>
            )}

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
