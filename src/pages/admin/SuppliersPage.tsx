
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Truck, Plus, Trash2, Phone, MapPin, Mail, X, AlertCircle } from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    ruc?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Supplier>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name');

            if (error) throw error;
            setSuppliers(data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('suppliers')
                .insert([formData]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({});
            fetchSuppliers();
        } catch (err: any) {
            console.error('Error creating supplier:', err);
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este proveedor?')) return;

        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            fetchSuppliers();
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        }
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
                    <h1 className="text-2xl font-bold text-fiori-header">Proveedores</h1>
                    <p className="text-fiori-text-light">Directorio de proveedores y contactos</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-fiori-blue text-white px-4 py-2 rounded-md hover:bg-fiori-blue-dark transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nuevo Proveedor</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                        No hay proveedores registrados.
                    </div>
                ) : (
                    suppliers.map((supplier) => (
                        <div key={supplier.id} className="bg-white rounded-lg shadow-card p-6 border border-gray-100 hover:border-fiori-blue transition-colors group relative">
                            <button
                                onClick={() => handleDelete(supplier.id)}
                                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-fiori-blue">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{supplier.name}</h3>
                                    {supplier.ruc && <div className="text-xs text-gray-500">RUC: {supplier.ruc}</div>}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                {supplier.contact_name && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 flex justify-center"><UserIcon className="w-3 h-3" /></div>
                                        <span>{supplier.contact_name}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 flex justify-center"><Phone className="w-3 h-3" /></div>
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 flex justify-center"><Mail className="w-3 h-3" /></div>
                                        <a href={`mailto:${supplier.email}`} className="hover:text-fiori-blue underline decoration-dotted">{supplier.email}</a>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 flex justify-center"><MapPin className="w-3 h-3" /></div>
                                        <span className="truncate">{supplier.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900">Nuevo Proveedor</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa / Nombre *</label>
                                <input className="fiori-input w-full" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                                    <input className="fiori-input w-full" value={formData.ruc || ''} onChange={e => setFormData({ ...formData, ruc: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input className="fiori-input w-full" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Principal</label>
                                <input className="fiori-input w-full" value={formData.contact_name || ''} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                <input type="email" className="fiori-input w-full" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <input className="fiori-input w-full" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>

                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full bg-fiori-blue text-white py-2 rounded-md hover:bg-fiori-blue-dark transition-colors disabled:opacity-50 mt-4"
                            >
                                {actionLoading ? 'Guardando...' : 'Guardar Proveedor'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
