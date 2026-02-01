import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useOtherIncomes, type OtherIncome } from '../../hooks/useOtherIncomes';
import { Plus, Trash2 } from 'lucide-react';

interface FormData {
    fecha: string;
    monto: number;
    descripcion: string;
    payment_method: 'cash' | 'yape' | 'card' | 'transfer';
    moneda: 'PEN' | 'USD';
}

export default function OtherIncomesPage() {
    const { getOtherIncomes, registerOtherIncome, deleteOtherIncome, loading } = useOtherIncomes();
    const [incomes, setIncomes] = useState<OtherIncome[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const { register, handleSubmit, reset, watch } = useForm<FormData>({
        defaultValues: {
            fecha: new Date().toLocaleDateString('en-CA'),
            monto: 0,
            descripcion: '',
            moneda: 'PEN'
        }
    });

    const selectedCurrency = watch('moneda');

    const loadIncomes = async () => {
        const start = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const data = await getOtherIncomes(start, end);
        setIncomes(data);
    };

    useEffect(() => {
        loadIncomes();
    }, [currentMonth, currentYear]);

    const onSubmit = async (data: FormData) => {
        try {
            await registerOtherIncome(data);
            reset({
                fecha: new Date().toLocaleDateString('en-CA'),
                monto: 0,
                descripcion: '',
                moneda: 'PEN',
                payment_method: 'cash'
            });
            loadIncomes();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este registro?')) {
            await deleteOtherIncome(id);
            loadIncomes();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-fiori-header">Otros Ingresos</h1>
                <p className="text-fiori-text-light">Préstamos, devoluciones y otros ingresos no operativos</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-card p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-fiori-blue" />
                            Registrar Ingreso
                        </h2>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                                <input
                                    type="date"
                                    {...register('fecha', { required: true })}
                                    className="fiori-input mt-1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Medio de Pago</label>
                                <select
                                    {...register('payment_method', { required: true })}
                                    className="fiori-input mt-1 w-full"
                                >
                                    <option value="cash">Efectivo</option>
                                    <option value="yape">Yape</option>
                                    <option value="card">Tarjeta</option>
                                    <option value="transfer">Transferencia</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Moneda</label>
                                <select
                                    {...register('moneda', { required: true })}
                                    className="fiori-input mt-1 w-full"
                                >
                                    <option value="PEN">Soles (PEN)</option>
                                    <option value="USD">Dólares (USD)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Monto ({selectedCurrency === 'USD' ? '$' : 'S/'})</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    {...register('monto', { required: true, min: 0 })}
                                    className="fiori-input mt-1"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                <input
                                    type="text"
                                    {...register('descripcion', { required: true })}
                                    className="fiori-input mt-1"
                                    placeholder="Ej: Préstamo banco, Devolución..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full fiori-btn fiori-btn-primary justify-center mt-2"
                            >
                                {loading ? 'Guardando...' : 'Guardar Ingreso'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filter */}
                    <div className="flex gap-2 bg-white p-4 rounded-lg shadow-sm">
                        <select
                            value={currentMonth}
                            onChange={(e) => setCurrentMonth(Number(e.target.value))}
                            className="fiori-input w-40"
                        >
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={currentYear}
                            onChange={(e) => setCurrentYear(Number(e.target.value))}
                            className="fiori-input w-24"
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-white rounded-lg shadow-card overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-green-50">
                            <h3 className="font-bold text-green-800">Total Otros Ingresos</h3>
                            <div className="flex gap-4">
                                <span className="text-sm font-bold text-green-700">
                                    S/ {incomes.filter(i => i.currency !== 'USD').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                                </span>
                                <span className="text-sm font-bold text-blue-700">
                                    $ {incomes.filter(i => i.currency === 'USD').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        <th className="px-6 py-3">Medio</th>
                                        <th className="px-6 py-3">Descripción</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                        <th className="px-6 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {incomes.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                No hay registros para este mes.
                                            </td>
                                        </tr>
                                    ) : (
                                        incomes.map((inc) => (
                                            <tr key={inc.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-900">{inc.date}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold
                                                        ${inc.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                                                            inc.payment_method === 'yape' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-blue-100 text-blue-700'}`}>
                                                        {inc.payment_method === 'cash' ? 'Efectivo' :
                                                            inc.payment_method === 'yape' ? 'Yape' :
                                                                inc.payment_method === 'card' ? 'Tarjeta' : 'Transf.'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600">{inc.description}</td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-900">
                                                    {inc.currency === 'USD' ? '$' : 'S/'} {inc.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => handleDelete(inc.id)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
