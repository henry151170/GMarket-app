import { useState } from 'react';
import { DollarSign, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
    const today = new Date();
    const [period, setPeriod] = useState('month'); // month | custom
    const [dateRange, setDateRange] = useState({
        start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
    });

    const isCustom = period === 'custom';

    const { cashHand, cashBank, cashBankUSD, totalBalance, incomeMonth, netProfitMonth, incomeToday, dailyIncome, loading } = useDashboard({
        start: dateRange.start,
        end: dateRange.end
    });

    const formatMoney = (amount: number) => {
        return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleResetData = async () => {
        if (!confirm("⚠️ ¿ESTÁS SEGURO? ⚠️\n\nEsto eliminará TODO el historial de ingresos, gastos y movimientos de caja permanentemente.\n\nEsta acción NO se puede deshacer.")) return;

        if (!confirm("CONFIRMACIÓN FINAL:\n\n¿Realmente deseas dejar la base de datos de movimientos en CERO?")) return;

        try {
            const { error } = await supabase.rpc('reset_all_financial_data');
            if (error) throw error;
            alert("✅ Historial eliminado correctamente. El sistema está limpio.");
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert("Error: " + (e.message || "No se pudo ejecutar la limpieza. Asegúrate de haber corrido el script SQL 'create_reset_function.sql'"));
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Cargando indicadores...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-fiori-header">Dashboard Financiero</h1>
                    <p className="text-fiori-text-light">Resumen general de la empresa</p>
                    <button
                        onClick={handleResetData}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 underline decoration-dotted"
                    >
                        (Borrar todo el historial)
                    </button>
                </div>

                {/* DATE FILTER */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-3 items-end md:items-center">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Periodo</label>
                        <select
                            value={period}
                            onChange={(e) => {
                                setPeriod(e.target.value);
                                if (e.target.value === 'month') {
                                    // Reset to current month
                                    const d = new Date();
                                    setDateRange({
                                        start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
                                        end: d.toISOString().split('T')[0]
                                    });
                                }
                            }}
                            className="fiori-input py-1 text-sm w-32"
                        >
                            <option value="month">Mes Actual</option>
                            <option value="custom">Entre fechas</option>
                        </select>
                    </div>

                    {isCustom && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                                    className="fiori-input py-1 text-sm"
                                />
                            </div>
                            <span className="text-gray-400 pb-2">-</span>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                                    className="fiori-input py-1 text-sm"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Saldo Disponible',
                        value: formatMoney(totalBalance),
                        icon: Wallet,
                        color: 'text-blue-600',
                        sub: `Caja: ${formatMoney(cashHand)} | B. Soles: ${formatMoney(cashBank)} | B. USD: $ ${cashBankUSD.toFixed(2)}`
                    },
                    {
                        label: isCustom ? 'Ingresos (Periodo)' : 'Ingresos del Mes',
                        value: formatMoney(incomeMonth),
                        icon: TrendingUp,
                        color: 'text-green-600',
                        sub: isCustom ? `${dateRange.start} - ${dateRange.end}` : 'Acumulado mensual'
                    },
                    {
                        label: isCustom ? 'Utilidad (Periodo)' : 'Utilidad Neta (Mes)',
                        value: formatMoney(netProfitMonth),
                        icon: DollarSign,
                        color: 'text-indigo-600',
                        sub: 'Ingresos - Gastos'
                    },
                    {
                        label: 'Ingresos Hoy',
                        value: formatMoney(incomeToday),
                        icon: ArrowUpRight,
                        color: 'text-emerald-600',
                        sub: 'Ventas de hoy'
                    },
                ].map((kpi, index) => (
                    <div key={index} className="fiori-card">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                                <h3 className="text-2xl font-bold mt-1 text-gray-900">{kpi.value}</h3>
                            </div>
                            <div className={`p-2 rounded-lg bg-gray-50 ${kpi.color}`}>
                                <kpi.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-xs text-gray-500">{kpi.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Placeholder Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="fiori-card min-h-[300px]">
                    <h3 className="font-semibold text-gray-800 mb-4">Evolución de Ingresos</h3>
                    {dailyIncome && dailyIncome.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyIncome}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => {
                                            const date = new Date(str + 'T00:00:00'); // Force local time interpretation
                                            return date.getDate().toString();
                                        }}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={(val) => `S/ ${val}`}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Ventas']}
                                        labelFormatter={(label) => new Date(label + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#2563eb"
                                        fillOpacity={1}
                                        fill="url(#colorIncome)"
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded border border-dashed text-sm">
                            No hay datos de ingresos para mostrar. Registra algunas ventas primero.
                        </div>
                    )}
                </div>
                <div className="fiori-card min-h-[300px]">
                    <h3 className="font-semibold text-gray-800 mb-4">Desglose Fiscal vs Real</h3>
                    <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded border border-dashed text-sm">
                        Proximamente: Comparativa de Documentos
                    </div>
                </div>
            </div>
        </div>
    );
}
