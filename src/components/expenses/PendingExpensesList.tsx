
import { useState, useEffect } from 'react';
import { useFixedExpenses, type FixedExpenseTemplate } from '../../hooks/useFixedExpenses';
import { useExpenses, type Expense } from '../../hooks/useExpenses';
import { CheckCircle, AlertCircle, Loader2, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function PendingExpensesList() {
    const { generateExpensesForPeriod, fetchTemplates } = useFixedExpenses();
    const { updateExpense, deleteExpense } = useExpenses(); // We'll need a way to filter pending

    const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
    const [templates, setTemplates] = useState<FixedExpenseTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        // 1. Fetch all expenses with status 'pending'
        const { data: expenses } = await supabase
            .from('expenses')
            .select('*')
            .eq('status', 'pending')
            .order('date', { ascending: true });

        // 2. Fetch templates to know available generation
        const tmpls = await fetchTemplates();

        setPendingExpenses((expenses as Expense[]) || []);
        setTemplates(tmpls || []);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleGenerate = async () => {
        if (!confirm('¿Generar todos los gastos fijos como pendientes para este mes?')) return;
        setLoading(true);
        const now = new Date();
        await generateExpensesForPeriod(now.getMonth() + 1, now.getFullYear());
        await loadData();
        setLoading(false);
    };

    const handlePay = async (expense: Expense) => {
        const confirmedAmount = prompt(`Confirmar monto para ${expense.description}:`, expense.amount.toString());
        if (confirmedAmount === null) return;

        const amount = parseFloat(confirmedAmount);
        if (isNaN(amount)) return alert('Monto inválido');

        setProcessingId(expense.id);

        await updateExpense(expense.id, {
            category: expense.category,
            description: expense.description.replace('[Pendiente] ', ''),
            amount: amount,
            date: expense.date, // Preserve original date (scheduled date)
            payment_method: 'cash', // Ask or default? Defaulting to cash/hand for now as per user context usually
            cash_location: 'hand',
            is_fixed: true,
            // Status update happens via updateExpense if we change the hook? 
            // Wait, useExpenses updateExpense doesn't accept 'status' field in FormData yet explicitly but we can pass it if we mapped it.
            // Actually, updateExpense uses FormData which lacks status.
            // We need to patch the expense status manually or update hook.
        } as any);

        // Current updateExpense logic doesn't support changing status to 'paid' explicitly in the args 
        // because generic updateExpense ignores fields not in the form data interface usually?
        // Let's check updateExpense implementation. It takes ExpenseFormData.
        // We need to allow status update.
        // Quick fix: Direct update for status.

        await supabase.from('expenses').update({ status: 'paid' }).eq('id', expense.id);

        setProcessingId(null);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Borrar este gasto pendiente?')) return;
        setProcessingId(id);
        await deleteExpense(id);
        setProcessingId(null);
        loadData();
    };

    if (loading && !pendingExpenses.length) return <div>Cargando...</div>;

    return (
        <div className="bg-white rounded-lg shadow-card p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        Gastos Pendientes
                    </h3>
                    <p className="text-sm text-gray-500">Gastos generados que aún no se han pagado.</p>
                </div>
                {pendingExpenses.length === 0 && (
                    <button
                        onClick={handleGenerate}
                        disabled={templates.length === 0}
                        className="fiori-btn fiori-btn-primary flex items-center gap-2 text-sm"
                    >
                        <Play className="w-4 h-4" /> Generar del Mes
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {pendingExpenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded border border-dashed">
                        No hay gastos pendientes.
                    </div>
                ) : (
                    pendingExpenses.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-lg">
                            <div>
                                <h4 className="font-bold text-gray-800">{item.description}</h4>
                                <span className="text-xs text-orange-600 font-bold uppercase">Pendiente</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-mono font-bold text-gray-700">{item.currency === 'USD' ? '$' : 'S/'} {item.amount.toFixed(2)}</span>
                                <button
                                    onClick={() => handlePay(item)}
                                    disabled={!!processingId}
                                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shadow-sm"
                                    title="Marcar como Pagado"
                                >
                                    {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-gray-400 hover:text-red-500 text-sm underline"
                                >
                                    Borrar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
