
import React, { useEffect, useState } from 'react';
import { Plus, ShoppingBag, Calendar, Package, ChevronDown, ChevronRight, X, Pencil, Trash2 } from 'lucide-react';
import { usePurchases, type Purchase } from '../../hooks/usePurchases';
import PurchaseForm from '../../components/purchases/PurchaseForm';

export default function PurchasesPage() {
    const { fetchPurchases, deletePurchase } = usePurchases();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchPurchases();
        setPurchases(data);
        setLoading(false);
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        setEditId(null);
        loadData();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('¿Está seguro de eliminar esta compra?')) {
            await deletePurchase(id);
            loadData();
        }
    };

    const handleEdit = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditId(id);
        setIsModalOpen(true);
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

    if (loading && !purchases.length) {
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
                    <h1 className="text-2xl font-bold text-fiori-header">Compras de Mercadería</h1>
                    <p className="text-fiori-text-light">Registro y control de compras a proveedores</p>
                </div>
                <button
                    onClick={() => { setEditId(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-fiori-blue text-white px-4 py-2 rounded-md hover:bg-fiori-blue-dark transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nueva Compra</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="w-10 px-6 py-4"></th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documentos</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pago</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {purchases.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                    No hay compras registradas.
                                </td>
                            </tr>
                        ) : (
                            purchases.map((purchase) => (
                                <React.Fragment key={purchase.id}>
                                    <tr
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => toggleRow(purchase.id)}
                                    >
                                        <td className="px-6 py-4 text-gray-400">
                                            {expandedRows.has(purchase.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(purchase.date + 'T00:00:00').toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {purchase.suppliers?.name || 'Proveedor desconocido'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {purchase.purchase_items?.length || 0} docs
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                                            {purchase.payment_method === 'cash' ? 'Efectivo' : purchase.payment_method}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            S/ {purchase.total_amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => handleEdit(purchase.id, e)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(purchase.id, e)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.has(purchase.id) && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="ml-10 bg-white rounded-md border border-gray-100 p-4">
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                        <Package className="w-4 h-4" />
                                                        Detalle de Documentos
                                                    </h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-gray-500">Documento</th>
                                                                    <th className="px-4 py-2 text-right text-gray-500">Monto</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {purchase.purchase_items?.map((item) => (
                                                                    <tr key={item.id}>
                                                                        <td className="px-4 py-2">{item.product_name}</td>
                                                                        <td className="px-4 py-2 text-right font-medium">S/ {item.total_price.toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 my-8">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-fiori-blue" />
                                {editId ? 'Editar Compra' : 'Registrar Compra'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <PurchaseForm
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
