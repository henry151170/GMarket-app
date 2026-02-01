import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { incomeSchema } from '../../lib/schemas';
import type { IncomeFormData } from '../../lib/schemas';
import { useAuth } from '../../contexts/AuthContext';

import { useIncomes } from '../../hooks/useIncomes';
import { useExpenses } from '../../hooks/useExpenses';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import CashCountInput from './CashCountInput';
import { Trash2, Eye, EyeOff } from 'lucide-react';

interface IncomeFormProps {
    refreshTrigger?: number;
}

export default function IncomeForm(props: IncomeFormProps) {
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID if editing
    const { profile } = useAuth();
    const { registerIncome, updateIncome, getIncomeById, checkIncomeExists, loading: submitting, error: submitError } = useIncomes();
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [profiles, setProfiles] = useState<any[]>([]);

    useEffect(() => {
        supabase.from('profiles').select('id, full_name').then(({ data }) => {
            if (data) setProfiles(data);
        });
    }, []);

    // Determine back link once
    const backLink = profile?.role === 'admin' ? '/admin/incomes' : '/worker';

    const form = useForm<IncomeFormData>({
        resolver: zodResolver(incomeSchema) as any,
        defaultValues: {
            fecha: new Date().toLocaleDateString('en-CA'),
            totalFacturas: 0,
            totalBoletas: 0,
            totalNotas: 0,
            totalCosto: 0,
            totalGastos: 0,
            observaciones: '',
            differenceAmount: 0,
            differenceReason: '',
            differenceNote: '',
            responsible_person: '',
            pagos: {
                efectivo: 0,
                yape: 0,
                tarjeta: 0,
                transferencia: 0,
                // efectivoUbicacion is optional, so undefined is implicit or we can explicit it
            }
        }
    });

    const { register, handleSubmit, formState: { errors }, watch, reset, setValue } = form;

    // Load data if editing
    useEffect(() => {
        if (id) {
            setLoadingData(true);
            getIncomeById(id)
                .then(data => {
                    if (data) {
                        // Set original date from DB to avoid duplicate check triggering
                        setOriginalDate(data.date);

                        // Transform DB data to Form Data
                        const payments = {
                            efectivo: 0,
                            efectivoUbicacion: undefined,
                            yape: 0,
                            tarjeta: 0,
                            transferencia: 0
                        };

                        data.income_payments.forEach((p: any) => {
                            if (p.method === 'cash') {
                                payments.efectivo = Number(p.amount);
                                // @ts-ignore
                                payments.efectivoUbicacion = p.cash_location;
                            } else if (p.method === 'yape') payments.yape = Number(p.amount);
                            else if (p.method === 'card') payments.tarjeta = Number(p.amount);
                            else if (p.method === 'transfer') payments.transferencia = Number(p.amount);
                        });

                        reset({
                            fecha: data.date,
                            totalFacturas: Number(data.total_facturas),
                            totalBoletas: Number(data.total_boletas),
                            totalNotas: Number(data.total_notas_venta),
                            totalCosto: Number(data.total_cost || 0),
                            // @ts-ignore
                            pagos: payments,
                            responsible_person: data.responsible_person
                        });
                    }
                })
                .catch(console.error)
                .finally(() => setLoadingData(false));
        }
    }, [id]);

    const totalFacturas = watch('totalFacturas') || 0;
    const totalBoletas = watch('totalBoletas') || 0;
    const totalNotas = watch('totalNotas') || 0;

    const pagoEfectivo = watch('pagos.efectivo') || 0;
    const pagoYape = watch('pagos.yape') || 0;
    const pagoTarjeta = watch('pagos.tarjeta') || 0;
    const pagoTransferencia = watch('pagos.transferencia') || 0;

    const totalDia = Number(totalFacturas) + Number(totalBoletas) + Number(totalNotas);

    // DAILY EXPENSES LOGIC
    const [dailyExpensesTotal, setDailyExpensesTotal] = useState(0);
    const [dailyExpensesList, setDailyExpensesList] = useState<any[]>([]);
    const [showExpenses, setShowExpenses] = useState(false);
    const { deleteExpense } = useExpenses();
    const selectedDate = watch('fecha');

    const fetchDailyExpenses = useCallback(async () => {
        if (!selectedDate) return;

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('date', selectedDate)
            .eq('status', 'paid');

        if (!error && data) {
            setDailyExpensesList(data);
            const total = data.reduce((sum, item) => sum + Number(item.amount), 0);
            setDailyExpensesTotal(total);
            setValue('totalGastos', total); // Sync with Zod Schema
        }
    }, [selectedDate, setValue]);

    useEffect(() => {
        fetchDailyExpenses();
    }, [fetchDailyExpenses, props.refreshTrigger]);

    const handleDeleteExpense = async (id: string) => {
        if (confirm('¿Eliminar este gasto?')) {
            await deleteExpense(id);
            // Refresh logic will re-fetch and re-set total/form value
            // But we need to call fetchDailyExpenses again.
            // We can simpler call it here:
            setTimeout(() => fetchDailyExpenses(), 500);
        }
    };

    const totalPagos = Number(pagoEfectivo) + Number(pagoYape) + Number(pagoTarjeta) + Number(pagoTransferencia) + dailyExpensesTotal;
    const diff = totalDia - totalPagos;
    const isBalanced = Math.abs(diff) < 0.01;
    // Store original date to check changes
    const [originalDate, setOriginalDate] = useState<string | null>(null);
    // REMOVED: Effect that auto-set originalDate from default val. Now set only in load effect.


    // Auto-calculate Cost (65%) and Utility (35%) when totalDia changes
    useEffect(() => {
        if (totalDia > 0) {
            const calculatedCost = Number((totalDia * 0.65).toFixed(2));
            setValue('totalCosto', calculatedCost);
        } else {
            setValue('totalCosto', 0);
        }
    }, [totalDia, setValue]);

    // Unused totalCosto watch removed

    useEffect(() => {
        if (selectedDate) {
            // If editing and date hasn't changed, don't flag as duplicate
            if (id && selectedDate === originalDate) {
                setAlreadyRegistered(false);
                return;
            }

            checkIncomeExists(selectedDate).then(exists => {
                setAlreadyRegistered(exists);
            });
        }
    }, [selectedDate, checkIncomeExists, id, originalDate]);

    // Sync Difference Amount to Form
    useEffect(() => {
        setValue('differenceAmount', Number(Math.abs(diff).toFixed(2)));
    }, [diff, setValue]);

    // Memoize the handler to prevent infinite loops/re-renders in child
    const handleCashCountChange = useCallback((val: number) => {
        setValue('pagos.efectivo', val, { shouldDirty: true, shouldTouch: true });
    }, [setValue]);

    const isAdmin = profile?.role === 'admin';

    const onSubmit = async (data: IncomeFormData) => {
        try {
            if (id) {
                await updateIncome(id, data);
                alert("¡Ingreso actualizado correctamente!");
            } else {
                await registerIncome(data);
                alert("¡Ingreso registrado correctamente!");
            }
            // Navigate immediately to avoid stuck state
            navigate(isAdmin ? '/admin/incomes' : '/worker');

        } catch (e: any) {
            console.error(e);
            alert("Error: " + (e.message || "Ocurrió un error al procesar"));
        }
    };

    if (loadingData) return <div className="p-8 text-center">Cargando datos...</div>;

    // submitSuccess block removed as it is unreachable

    return (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-card overflow-hidden relative">
            <div className="bg-fiori-header px-6 py-4 text-white flex justify-between items-center relative">
                <div>
                    <h2 className="text-lg font-bold">{id ? 'Editar Ingreso' : 'Registrar Ingresos del Día'}</h2>
                    <p className="text-xs text-gray-300">{id ? 'Modifica los valores' : 'Ingresa totales y desglose'}</p>
                </div>

                <div className="flex items-center gap-4">
                    {alreadyRegistered && (
                        <div className="bg-yellow-500/20 px-3 py-1 rounded border border-yellow-400/50 flex items-center gap-2 mr-8">
                            <AlertTriangle className="w-4 h-4 text-yellow-300" />
                            <span className="text-xs font-bold text-yellow-100 hidden sm:inline">Registro Existente para {selectedDate}</span>
                        </div>
                    )}

                    {/* Absolute X Button */}
                    <a
                        href={backLink}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                        title="Cerrar"
                    >
                        <X className="w-6 h-6" />
                    </a>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: TOTALS */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <div className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                            <h3 className="font-semibold text-gray-800">Totales por Comprobante</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Encargado de Cierre</label>
                            <select
                                {...register('responsible_person')}
                                className="fiori-input mt-1 w-full"
                            >
                                <option value="">-- Seleccionar --</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.full_name || 'Sin nombre'}>{p.full_name || 'Sin nombre'}</option>
                                ))}
                            </select>
                            {errors.responsible_person && <span className="text-xs text-red-500">{errors.responsible_person.message}</span>}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                                <input
                                    type="date"
                                    {...register('fecha')}
                                    className="fiori-input mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Facturas</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">S/</span>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="0.00"
                                            {...register('totalFacturas')}
                                            className="fiori-input pl-6 font-mono"
                                        />
                                    </div>
                                    {errors.totalFacturas && <span className="text-xs text-red-500">{errors.totalFacturas.message}</span>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Boletas</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">S/</span>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="0.00"
                                            {...register('totalBoletas')}
                                            className="fiori-input pl-6 font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Notas</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">S/</span>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="0.00"
                                            {...register('totalNotas')}
                                            className="fiori-input pl-6 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Compact Total Block */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 font-bold uppercase">Total del Día</span>
                                    <span className="text-2xl font-black text-blue-900">S/ {totalDia.toFixed(2)}</span>
                                </div>
                                {/* Hidden input for Cost */}
                                <input type="hidden" {...register('totalCosto')} />
                                <input type="hidden" {...register('differenceAmount')} />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PAYMENTS */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <div className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                            <h3 className="font-semibold text-gray-800">Métodos de Pago</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Efectivo & Arqueo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">💵 Efectivo Arqueado</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number" step="0.01" min="0"
                                        {...register('pagos.efectivo')}
                                        className="fiori-input font-bold text-lg" // Larger text for main input
                                    />
                                </div>

                                <CashCountInput onTotalChange={handleCashCountChange} />

                                <div className={clsx("mt-3 flex items-center gap-4 text-sm p-3 rounded-lg transition-colors border duration-300",
                                    errors.pagos?.efectivoUbicacion ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-100"
                                )}>
                                    <span className={clsx("font-bold", errors.pagos?.efectivoUbicacion ? "text-red-700" : "text-gray-500")}>
                                        Destino (Requerido):
                                    </span>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded border shadow-sm transition-all hover:bg-gray-50">
                                        <input type="radio" value="hand" {...register('pagos.efectivoUbicacion')} className="text-fiori-blue focus:ring-fiori-blue" />
                                        <span>Caja</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded border shadow-sm transition-all hover:bg-gray-50">
                                        <input type="radio" value="bank" {...register('pagos.efectivoUbicacion')} className="text-fiori-blue focus:ring-fiori-blue" />
                                        <span>Banco</span>
                                    </label>
                                </div>
                            </div>

                            {/* Other Payment Methods (Horizontal Grid) */}
                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">📱 Yape</label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        {...register('pagos.yape')}
                                        className="fiori-input text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">💳 Tarjeta</label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        {...register('pagos.tarjeta')}
                                        className="fiori-input text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">🏦 Transf.</label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        {...register('pagos.transferencia')}
                                        className="fiori-input text-sm"
                                    />
                                </div>
                            </div>

                            {/* Daily Expenses Display */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-red-600">📉 Gastos del Día (Pagados)</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowExpenses(!showExpenses)}
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        {showExpenses ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {showExpenses ? 'Ocultar' : 'Ver Detalles'}
                                    </button>
                                </div>

                                <div className="relative mb-2">
                                    <span className="absolute left-3 top-2 text-red-300 font-bold">S/</span>
                                    <input
                                        type="text"
                                        readOnly
                                        disabled
                                        value={dailyExpensesTotal.toFixed(2)}
                                        className="w-full bg-red-50 border border-red-100 rounded-md py-2 pl-8 font-bold text-red-700"
                                    />
                                </div>

                                {showExpenses && (
                                    <div className="bg-white border border-gray-200 rounded-md overflow-hidden text-xs animate-in fade-in slide-in-from-top-2">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-2 py-1 text-left text-gray-500">Descripción</th>
                                                    <th className="px-2 py-1 text-right text-gray-500">Monto</th>
                                                    <th className="px-2 py-1"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {dailyExpensesList.map((expense) => (
                                                    <tr key={expense.id} className="hover:bg-red-50">
                                                        <td className="px-2 py-1.5 text-gray-700">{expense.description}</td>
                                                        <td className="px-2 py-1.5 text-right font-medium text-red-600">
                                                            {Number(expense.amount).toFixed(2)}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteExpense(expense.id)}
                                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                                title="Eliminar gasto"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {dailyExpensesList.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="px-2 py-3 text-center text-gray-400 italic">
                                                            No hay gastos registrados hoy.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <p className="text-[10px] text-gray-400 mt-1">Este monto se suma a los pagos para cuadrar con las ventas.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-gray-200" />

                {/* BOTTOM BAR: SUMMARY AND ACTIONS */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">

                    {/* Status Indicator & Justification Section */}
                    <div className={clsx("flex-1 w-full p-4 rounded-lg border transition-all duration-300",
                        isBalanced ? "bg-green-50 border-green-200 text-green-800" : (Math.abs(diff) <= 3 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200")
                    )}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={clsx("text-xs uppercase font-bold tracking-wider", isBalanced ? "text-green-800" : (Math.abs(diff) <= 3 ? "text-amber-800" : "text-red-800"))}>
                                Estado del Cuadre
                            </span>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-700">Total Pagos: <strong>S/ {totalPagos.toFixed(2)}</strong></span>
                                {isBalanced ? (
                                    <span className="flex items-center gap-1 font-bold text-green-700"><CheckCircle2 className="w-4 h-4" /> OK</span>
                                ) : (
                                    <span className={clsx("font-bold flex items-center gap-2", Math.abs(diff) <= 3 ? "text-amber-700" : "text-red-700")}>
                                        Diferencia: {diff > 0 ? '-' : '+'} S/ {Math.abs(diff).toFixed(2)}
                                        {Math.abs(diff) <= 3 && <span className="text-[10px] bg-amber-200 px-1 rounded text-amber-900 border border-amber-300">TOLERANCIA</span>}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Justification Form (Shown if NOT balanced) */}
                        {!isBalanced && totalDia > 0 && (
                            <div className="mt-3 bg-white/80 p-3 rounded border border-gray-200 animate-in fade-in slide-in-from-top-1 text-left">
                                <h4 className="font-bold text-xs mb-2 flex items-center gap-2">
                                    {Math.abs(diff) <= 3 ? (
                                        <span className="text-amber-600 flex items-center gap-1">⚠️ Diferencia Menor (Motivo Opcional)</span>
                                    ) : (
                                        <span className="text-red-600 flex items-center gap-1">🚫 Diferencia Mayor (Justificación Obligatoria)</span>
                                    )}
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Motivo</label>
                                        <select
                                            {...register('differenceReason')}
                                            className="fiori-input w-full text-sm py-1"
                                        >
                                            <option value="">-- Seleccione --</option>
                                            <option value="Redondeo en efectivo">Redondeo en efectivo</option>
                                            <option value="Pago no registrado">Pago no registrado</option>
                                            <option value="Error de digitación">Error de digitación</option>
                                            <option value="Faltante inexplicable">Faltante inexplicable</option>
                                            <option value="Sobrante de caja">Sobrante de caja</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                        {errors.differenceReason && <p className="text-xs text-red-600 mt-1 font-bold">{errors.differenceReason.message}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Nota (Opcional)</label>
                                        <input
                                            type="text"
                                            {...register('differenceNote')}
                                            placeholder="Detalles..."
                                            className="fiori-input w-full text-sm py-1"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                        <div className="flex gap-3 w-full">
                            <a
                                href={backLink}
                                className="fiori-btn fiori-btn-secondary flex-1 md:flex-none justify-center text-center flex items-center"
                            >
                                Cancelar
                            </a>
                            <button
                                type="submit"
                                // BUTTON ENABLED LOGIC:
                                // Disabled if: Sending OR Total is 0 OR AlreadyRegistered
                                // But NOT disabled by 'isBalanced' purely - Zod handles the validity (Exact match OR Tolerance w/ Reason)
                                disabled={submitting || totalDia === 0 || alreadyRegistered}
                                className={clsx("fiori-btn flex-1 md:flex-none justify-center gap-2 px-8",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    Math.abs(diff) > 3 ? "fiori-btn-primary" : "fiori-btn-primary" // Can add distinct styles if warning
                                )}
                            >
                                {submitting ? 'Guardando...' : (
                                    <>
                                        <Save className="w-4 h-4" /> Guardar
                                    </>
                                )}
                            </button>
                        </div>
                        {Object.keys(errors).length > 0 && (
                            <div className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100 animate-pulse">
                                ⚠️ Revise campos marcados (ej. Destino de Efectivo)
                            </div>
                        )}
                    </div>

                    {errors.root && <p className="text-red-600 text-sm font-bold w-full text-center">{errors.root.message}</p>}
                </div>

                {
                    submitError && (
                        <div className="mt-4 bg-red-50 text-red-700 p-3 rounded text-sm text-center">
                            {submitError}
                        </div>
                    )
                }
            </form >
        </div >
    );
}
