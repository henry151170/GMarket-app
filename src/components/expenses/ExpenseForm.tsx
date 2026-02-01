
import React, { useState } from 'react';
import { useExpenses, type ExpenseFormData } from '../../hooks/useExpenses';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { Save, AlertCircle } from 'lucide-react';

interface ExpenseFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    editId?: string | null;
}

export default function ExpenseForm({ onSuccess, onCancel, editId }: ExpenseFormProps) {
    const { createExpense, updateExpense, getExpenseById, loading, error } = useExpenses();
    const { categories } = useExpenseCategories();

    const [loadingData, setLoadingData] = React.useState(false);
    const [isCustomSource, setIsCustomSource] = useState(false);
    const [formData, setFormData] = useState<ExpenseFormData>({
        category: '', // Will update on load
        description: '',
        amount: 0,
        currency: 'PEN',
        date: new Date().toLocaleDateString('en-CA'),
        payment_method: 'cash',
        cash_location: 'hand',
        is_fixed: false
    });

    // Set default category
    React.useEffect(() => {
        if (categories.length > 0 && !formData.category && !editId) {
            setFormData(prev => ({ ...prev, category: categories[0].name }));
        }
    }, [categories, editId]);

    React.useEffect(() => {
        if (editId) {
            setLoadingData(true);
            getExpenseById(editId).then(data => {
                if (data) {
                    setFormData({
                        category: data.category,
                        description: data.description,
                        amount: data.amount,
                        currency: data.currency || 'PEN',
                        date: data.date,
                        payment_method: data.payment_method,
                        cash_location: data.cash_location,
                        is_fixed: data.is_fixed
                    });
                }
            }).finally(() => setLoadingData(false));
        }
    }, [editId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Detect fixed status from selected category
        const selectedCat = categories.find(c => c.name === formData.category);
        const isFixedCategory = selectedCat?.is_fixed || false;

        // Handle Custom Cash Location
        let finalDescription = formData.description;
        let finalCashLocation = formData.cash_location;

        if (formData.payment_method === 'cash') {
            const isStandardLocation = ['hand', 'bank'].includes(formData.cash_location || '');
            if (!isStandardLocation && formData.cash_location) {
                // Custom location logic
                finalDescription = `[Origen: ${formData.cash_location}] ${formData.description}`;
                finalCashLocation = 'hand'; // Default to hand for DB schema compatibility
            }
        }

        const dataToSubmit = {
            ...formData,
            description: finalDescription,
            cash_location: finalCashLocation as any,
            is_fixed: isFixedCategory
        };

        let success = false;
        if (editId) {
            success = await updateExpense(editId, dataToSubmit);
        } else {
            success = await createExpense(dataToSubmit);
        }

        if (success) {
            onSuccess();
        }
    };

    if (loadingData) return <div className="p-8 text-center text-gray-500">Cargando información...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                        className="fiori-input w-full"
                        value={formData.category} // Using name directly now
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                        <optgroup label="Gastos Operativos">
                            {categories.filter(c => !c.is_fixed).map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Gastos Fijos">
                            {categories.filter(c => c.is_fixed).map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                        type="date"
                        required
                        className="fiori-input w-full"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                    type="text"
                    required
                    placeholder="Detalle del gasto..."
                    className="fiori-input w-full"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <div className="relative">
                    <select
                        className="absolute left-1 top-1.5 bottom-1 text-sm border-none bg-transparent font-bold text-gray-700 focus:ring-0 p-0 h-auto pl-2 pr-6 border-r border-gray-200"
                        value={formData.currency}
                        onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value as any }))}
                    >
                        <option value="PEN">S/</option>
                        <option value="USD">$</option>
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        required
                        className="fiori-input w-full pl-20 text-lg font-semibold"
                        value={formData.amount || ''}
                        onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medio de Pago</label>
                    <select
                        className="fiori-input w-full"
                        value={formData.payment_method}
                        onChange={e => {
                            const method = e.target.value;
                            setFormData({
                                ...formData,
                                payment_method: method,
                                cash_location: method === 'cash' ? 'hand' : formData.cash_location
                            });
                        }}
                    >
                        <option value="cash">Efectivo</option>
                        <option value="yape">Yape / Plin</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                    </select>
                </div>

                {formData.payment_method === 'cash' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Origen del Efectivo</label>
                        {!isCustomSource ? (
                            <select
                                className="fiori-input w-full"
                                value={['hand', 'bank'].includes(formData.cash_location || '') ? formData.cash_location : 'new'}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === 'new') {
                                        setIsCustomSource(true);
                                        setFormData({ ...formData, cash_location: '' });
                                    } else {
                                        setFormData({ ...formData, cash_location: val as any });
                                    }
                                }}
                            >
                                <option value="hand">Caja Chica</option>
                                <option value="bank">Banco</option>
                                <option value="new" className="font-bold text-blue-600">+ Crear nuevo origen...</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Especifique origen (ej. Caja Fuerte)"
                                    className="fiori-input w-full"
                                    autoFocus
                                    value={formData.cash_location === 'hand' || formData.cash_location === 'bank' ? '' : formData.cash_location} // Avoid showing 'hand'/'bank' in input
                                    onChange={e => setFormData({ ...formData, cash_location: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomSource(false);
                                        setFormData({ ...formData, cash_location: 'hand' });
                                    }}
                                    className="px-3 py-2 text-gray-500 hover:text-red-600 border rounded-md hover:bg-gray-50"
                                    title="Cancelar"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Seleccione o escriba el origen del dinero.</p>
                    </div>
                )}
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {loading ? 'Guardando...' : (editId ? 'Actualizar Gasto' : 'Registrar Gasto')}
                </button>
            </div>
        </form>
    );
}
