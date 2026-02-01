import { useState } from 'react';
import { TrendingDown, X } from 'lucide-react';
import IncomeForm from '../../components/incomes/IncomeForm';
import ExpenseForm from '../../components/expenses/ExpenseForm';

export default function RegisterIncomePage() {
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [refreshExpenses, setRefreshExpenses] = useState(0);

    return (
        <div className="container mx-auto max-w-4xl space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200 font-medium shadow-sm"
                >
                    <TrendingDown className="w-5 h-5" />
                    <span>Registrar Gasto (Salida)</span>
                </button>
            </div>

            <IncomeForm refreshTrigger={refreshExpenses} />

            {/* Expense Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                                Registrar Gasto
                            </h2>
                            <button
                                onClick={() => setIsExpenseModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <ExpenseForm
                                key={refreshExpenses} // Re-mounts form (clearing inputs) when refreshExpenses changes
                                onSuccess={() => {
                                    // Keep modal open for multiple entries
                                    setRefreshExpenses(prev => prev + 1);
                                }}
                                onCancel={() => setIsExpenseModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
