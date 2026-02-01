
import React, { useState, useEffect } from 'react';
import { usePurchases } from '../../hooks/usePurchases';
import { supabase } from '../../lib/supabase';
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react';

interface PurchaseFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    editId?: string | null;
}

interface SupplierOption {
    id: string;
    name: string;
}

export default function PurchaseForm({ onSuccess, onCancel, editId }: PurchaseFormProps) {
    const { createPurchase, updatePurchase, getPurchaseById, loading, error: submitError } = usePurchases();
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [supplierId, setSupplierId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ id: Date.now(), product_name: '', quantity: 1, unit_price: 0 }]);

    // Load data if editing
    useEffect(() => {
        if (editId) {
            setLoadingData(true);
            getPurchaseById(editId).then(data => {
                if (data) {
                    setDate(data.date);
                    setSupplierId(data.supplier_id || '');
                    setPaymentMethod(data.payment_method);
                    setNotes(data.notes || '');

                    if (data.purchase_items && data.purchase_items.length > 0) {
                        setItems(data.purchase_items.map((item: any) => ({
                            id: item.id || Date.now(), // Use existing ID or new temp
                            product_name: item.product_name,
                            quantity: item.quantity,
                            unit_price: item.unit_price
                        })));
                    }
                }
            }).finally(() => setLoadingData(false));
        }
    }, [editId]);

    // New Supplier State
    const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');

    const saveNewSupplier = async () => {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .insert({ name: newSupplierName.trim() })
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setSuppliers([...suppliers, data].sort((a, b) => a.name.localeCompare(b.name)));
                setSupplierId(data.id);
                setIsCreatingSupplier(false);
                setNewSupplierName('');
            }
        } catch (error) {
            console.error('Error creating supplier:', error);
            alert('Error al crear proveedor');
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('id, name').order('name');
        if (data) setSuppliers(data);
    };

    const handleDeleteSupplier = async () => {
        if (!supplierId) return;

        const supplierToDelete = suppliers.find(s => s.id === supplierId);
        if (!supplierToDelete) return;

        if (window.confirm(`¿Está seguro de eliminar el proveedor "${supplierToDelete.name}"?`)) {
            try {
                const { error } = await supabase
                    .from('suppliers')
                    .delete()
                    .eq('id', supplierId);

                if (error) throw error;

                setSuppliers(suppliers.filter(s => s.id !== supplierId));
                setSupplierId('');
            } catch (error) {
                console.error('Error deleting supplier:', error);
                alert('No se puede eliminar el proveedor porque tiene compras asociadas o ocurrió un error.');
            }
        }
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), product_name: '', quantity: 1, unit_price: 0 }]);
    };

    const removeItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const purchaseData = {
            date,
            supplier_id: supplierId,
            payment_method: paymentMethod,
            notes,
            items: items.map(({ product_name, quantity, unit_price }) => ({
                product_name, // Now stores "Document Number"
                quantity: 1,  // Hardcoded as we operate on full document amount
                unit_price: Number(unit_price) // Now stores "Amount"
            }))
        };

        let success = false;
        if (editId) {
            success = await updatePurchase(editId, purchaseData);
        } else {
            success = await createPurchase(purchaseData);
        }

        if (success) {
            onSuccess();
        }
    };

    if (loadingData) return <div className="p-10 text-center">Cargando datos...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {submitError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                    <div className="flex gap-2">
                        {isCreatingSupplier ? (
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nombre del nuevo proveedor"
                                    className="fiori-input w-full"
                                    value={newSupplierName}
                                    onChange={e => setNewSupplierName(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={saveNewSupplier}
                                    disabled={!newSupplierName.trim()}
                                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    title="Guardar Proveedor"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingSupplier(false)}
                                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                    title="Cancelar"
                                >
                                    <Trash2 className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <select
                                    className="fiori-input w-full"
                                    value={supplierId}
                                    onChange={e => setSupplierId(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione un proveedor...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingSupplier(true)}
                                    className="px-3 py-2 bg-fiori-blue/10 text-fiori-blue border border-fiori-blue/20 rounded-md hover:bg-fiori-blue/20 transition-colors"
                                    title="Crear Nuevo Proveedor"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                                {supplierId && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteSupplier}
                                        className="px-3 py-2 text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                                        title="Eliminar Proveedor"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                        type="date"
                        required
                        className="fiori-input w-full"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documentos (Facturas / Guías)</label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Nro Documento (ej. F001-123)"
                                        className="fiori-input w-full text-sm"
                                        value={item.product_name}
                                        onChange={e => updateItem(item.id, 'product_name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="w-32">
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">S/</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Monto"
                                            className="fiori-input w-full pl-6 text-sm text-right"
                                            value={item.unit_price}
                                            onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                    disabled={items.length === 1}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-4 flex items-center gap-1 text-sm text-fiori-blue font-medium hover:underline"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Documento
                    </button>

                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Total Compra</span>
                        <span className="text-xl font-bold text-gray-900">S/ {calculateTotal().toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medio de Pago</label>
                    <select
                        className="fiori-input w-full"
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                    >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="yape">Yape / Plin</option>
                        <option value="card">Tarjeta Crédito/Débito</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Observaciones</label>
                    <input
                        type="text"
                        className="fiori-input w-full"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
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
                    className="flex-1 px-4 py-2 bg-fiori-blue text-white rounded-md hover:bg-fiori-blue-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {loading ? 'Guardando...' : (editId ? 'Actualizar Compra' : 'Registrar Compra')}
                </button>
            </div>
        </form>
    );
}
