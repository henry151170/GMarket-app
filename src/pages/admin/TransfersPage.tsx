import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeftRight, CheckCircle2, Calendar, ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import { useExchangeRate } from '../../hooks/useExchangeRate';

interface Transfer {
    id: string;
    amount: number;
    date: string;
    origin: 'hand' | 'bank';
    destination: 'hand' | 'bank';
    description: string;
    created_at: string;
    currency_origin: 'PEN' | 'USD';
    currency_destination: 'PEN' | 'USD';
    exchange_rate: number;
}

export default function TransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const { rate, loading: loadingRate } = useExchangeRate();

    // Form State
    const [amount, setAmount] = useState('');
    const [destAmount, setDestAmount] = useState('');
    const [origin, setOrigin] = useState<'hand' | 'bank'>('hand');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Currency State
    const [currencyOrigin, setCurrencyOrigin] = useState<'PEN' | 'USD'>('PEN');
    const [currencyDestination, setCurrencyDestination] = useState<'PEN' | 'USD'>('PEN');
    const [exchangeRate, setExchangeRate] = useState<string>('1.000');

    useEffect(() => {
        fetchTransfers();
    }, []);

    useEffect(() => {
        // Auto-set exchange rate if cross-currency
        if (currencyOrigin !== currencyDestination && rate) {
            // Selling PEN for USD (Buying USD) -> Venta Rate?
            // "compra" = Bank buys Dollars. "venta" = Bank sells Dollars.
            // If I have PEN and want USD (Origin PEN, Dest USD) -> I am buying Dollars from Bank -> 'venta' rate.
            // If I have USD and want PEN (Origin USD, Dest PEN) -> I am selling Dollars to Bank -> 'compra' rate.

            if (currencyOrigin === 'PEN' && currencyDestination === 'USD') {
                setExchangeRate(rate.venta.toString());
            } else if (currencyOrigin === 'USD' && currencyDestination === 'PEN') {
                setExchangeRate(rate.compra.toString());
            }
        } else {
            setExchangeRate('1.000');
        }
    }, [currencyOrigin, currencyDestination, rate]);

    const fetchTransfers = async () => {
        try {
            const { data, error } = await supabase
                .from('fund_transfers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransfers(data || []);
        } catch (error) {
            console.error('Error fetching transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta transferencia? Se revertirán los saldos.')) return;
        setLoading(true); // Optimistic UI or wait? Better wait.
        try {
            const { error } = await supabase
                .from('fund_transfers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchTransfers();
        } catch (error) {
            console.error('Error deleting transfer:', error);
            alert('Error al eliminar transferencia');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('No user');

            // Destination is opposite of origin
            const destination = origin === 'hand' ? 'bank' : 'hand';

            const { error } = await supabase
                .from('fund_transfers')
                .insert({
                    amount: parseFloat(amount),
                    origin,
                    destination,
                    description,
                    user_id: user.id,
                    currency_origin: currencyOrigin,
                    currency_destination: currencyDestination,
                    exchange_rate: parseFloat(exchangeRate)
                });

            if (error) throw error;

            // Reset and reload
            setAmount('');
            setDescription('');
            fetchTransfers();
        } catch (error) {
            console.error('Error creating transfer:', error);
            alert('Error al registrar transferencia');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getLocationLabel = (loc: string) => loc === 'hand' ? 'Caja Chica (Mano)' : 'Banco';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-fiori-header">Transferencias de Fondos</h1>
                    <p className="text-fiori-text-light">Movimientos de dinero entre Caja Chica y Banco</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="bg-white p-6 rounded-lg shadow-card h-fit">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-fiori-blue" />
                        Nueva Transferencia
                    </h2>

                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between gap-2">
                            {/* ORIGIN */}
                            <div className={`flex flex-col items-center gap-2 flex-1 p-2 rounded cursor-pointer transition-colors ${origin === 'hand' ? 'bg-white shadow-sm font-semibold text-fiori-blue' : 'text-gray-500'}`}
                                onClick={() => setOrigin('hand')}>
                                <span className="text-xs uppercase tracking-wide">Origen</span>
                                <span>Caja</span>
                                <select
                                    className="text-xs border-none bg-transparent font-bold underline"
                                    value={currencyOrigin}
                                    onChange={e => setCurrencyOrigin(e.target.value as any)}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <option value="PEN">PEN</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>

                            <div className="px-1 text-gray-400">
                                <ArrowRight className="w-5 h-5" />
                            </div>

                            {/* DESTINATION (Opposite logic simplified for UI but kept flexible in state if needed, though locked by logic above) */}
                            <div className={`flex flex-col items-center gap-2 flex-1 p-2 rounded cursor-pointer transition-colors ${origin === 'bank' ? 'bg-white shadow-sm font-semibold text-fiori-blue' : 'text-gray-500'}`}
                                onClick={() => setOrigin('bank')}>
                                <span className="text-xs uppercase tracking-wide">Origen</span>
                                <span>Banco</span>
                                <select
                                    className="text-xs border-none bg-transparent font-bold underline"
                                    value={currencyOrigin === 'PEN' ? currencyOrigin : currencyOrigin} // Wait, origin defines location, currency defines currency.
                                    // If Origin is Bank, we can pick currency there too?
                                    // Yes.
                                    // But destination implies the other place.
                                    // Let's restart the selector logic for UI cleanliness.
                                    onChange={e => setCurrencyOrigin(e.target.value as any)}
                                    disabled={true} // Reusing the same state is tricky if we want distinct selectors visually attached to buttons.
                                >
                                    {/* Actually just showing the origin currency here is enough context */}
                                </select>
                            </div>
                        </div>

                        {/* Better UI for Route & Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Moneda Origen</label>
                                <select
                                    className="fiori-input w-full text-sm"
                                    value={currencyOrigin}
                                    onChange={e => setCurrencyOrigin(e.target.value as any)}
                                >
                                    <option value="PEN">Soles (PEN)</option>
                                    <option value="USD">Dólares (USD)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Moneda Destino</label>
                                <select
                                    className="fiori-input w-full text-sm"
                                    value={currencyDestination}
                                    onChange={e => setCurrencyDestination(e.target.value as any)}
                                >
                                    <option value="PEN">Soles (PEN)</option>
                                    <option value="USD">Dólares (USD)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-center text-gray-500 bg-gray-50 p-2 rounded">
                            <span>De: <strong className="text-gray-700">{origin === 'hand' ? 'Caja' : 'Banco'}</strong></span>
                            <ArrowRight className="w-3 h-3" />
                            <span>A: <strong className="text-gray-700">{origin === 'hand' ? 'Banco' : 'Caja'}</strong></span>
                        </div>

                        {currencyOrigin !== currencyDestination && (
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-100 animate-in fade-in">
                                <label className="block text-xs font-bold text-yellow-800 mb-1 flex justify-between">
                                    Tipo de Cambio (SUNAT)
                                    {loadingRate && <RefreshCw className="w-3 h-3 animate-spin" />}
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    className="fiori-input w-full text-sm border-yellow-300 focus:border-yellow-500"
                                    value={exchangeRate}
                                    onChange={e => setExchangeRate(e.target.value)}
                                />
                                <p className="text-[10px] text-yellow-600 mt-1">
                                    Se sugiere {currencyOrigin === 'USD' ? 'compra' : 'venta'}: {rate ? (currencyOrigin === 'USD' ? rate.compra : rate.venta) : '...'}
                                </p>
                            </div>
                        )}

                        {/* Amount Section with Sync */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monto a Enviar ({currencyOrigin})
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="fiori-input w-full text-lg font-bold"
                                    value={amount}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setAmount(val);
                                        // Auto-calc received
                                        if (val && currencyOrigin !== currencyDestination) {
                                            const rateVal = parseFloat(exchangeRate) || 1;
                                            if (currencyOrigin === 'PEN' && currencyDestination === 'USD') {
                                                // Buying USD: I give 3.75 PEN -> Get 1 USD. (Divide by rate)
                                                // Wait, Venta rate = 3.75. I pay 3.75 PEN to get 1 USD.
                                                // So AmountUSD = AmountPEN / Rate.
                                                setDestAmount((parseFloat(val) / rateVal).toFixed(2));
                                            } else if (currencyOrigin === 'USD' && currencyDestination === 'PEN') {
                                                // Selling USD: I give 1 USD -> Get 3.70 PEN. (Multiply by rate)
                                                // AmountPEN = AmountUSD * Rate.
                                                setDestAmount((parseFloat(val) * rateVal).toFixed(2));
                                            }
                                        } else {
                                            setDestAmount(val);
                                        }
                                    }}
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monto a Recibir ({currencyDestination})
                                </label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="fiori-input w-full text-lg font-bold bg-gray-50"
                                    value={destAmount}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setDestAmount(val);
                                        // Auto-calc sent
                                        if (val && currencyOrigin !== currencyDestination) {
                                            const rateVal = parseFloat(exchangeRate) || 1;
                                            if (currencyOrigin === 'PEN' && currencyDestination === 'USD') {
                                                // Buying USD. I want 1 USD. Cost = 1 * 3.75.
                                                // AmountPEN = AmountUSD * Rate.
                                                setAmount((parseFloat(val) * rateVal).toFixed(2));
                                            } else if (currencyOrigin === 'USD' && currencyDestination === 'PEN') {
                                                // Selling USD. I want 3.70 PEN. Cost = 3.70 / 3.70 = 1 USD.
                                                // AmountUSD = AmountPEN / Rate.
                                                setAmount((parseFloat(val) / rateVal).toFixed(2));
                                            }
                                        } else {
                                            setAmount(val);
                                        }
                                    }}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Motivo</label>
                            <input
                                type="text"
                                required
                                className="fiori-input w-full"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Ej: Depósito de ventas del día..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-fiori-blue text-white py-2.5 rounded-md hover:bg-fiori-blue-dark transition-colors shadow-sm font-medium disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? 'Procesando...' : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Confirmar Transferencia
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* History Section */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-800">Historial de Transferencias</h2>
                    </div>
                    {loading ? (
                        <div className="p-10 text-center"><div className="inline-block animate-spin w-6 h-6 border-2 border-fiori-blue border-t-transparent rounded-full"></div></div>
                    ) : transfers.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No hay transferencias registradas.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Fecha</th>
                                        <th className="px-6 py-3 text-left">Descripción</th>
                                        <th className="px-6 py-3 text-center">Ruta</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transfers.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(t.date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                                {t.description}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-center">
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                                                        <span>{getLocationLabel(t.origin)}</span>
                                                        <ArrowRight className="w-3 h-3 text-gray-400" />
                                                        <span>{getLocationLabel(t.destination)}</span>
                                                    </div>
                                                    {t.currency_origin !== t.currency_destination && (
                                                        <span className="text-[10px] text-gray-400">
                                                            T.C: {t.exchange_rate}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div>
                                                        {t.currency_origin === 'USD' ? '$' : 'S/'} {t.amount.toFixed(2)}
                                                        <div className="text-[10px] text-gray-400 font-normal">
                                                            {t.currency_origin !== t.currency_destination && (
                                                                <>
                                                                    ≈ {t.currency_destination === 'USD' ? '$' : 'S/'} {(
                                                                        t.currency_origin === 'USD'
                                                                            ? t.amount * t.exchange_rate
                                                                            : t.amount / (t.exchange_rate || 1)
                                                                    ).toFixed(2)}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        title="Eliminar transferencia"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
