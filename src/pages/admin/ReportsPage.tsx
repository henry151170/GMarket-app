import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useReports, type ReportSummary } from '../../hooks/useReports';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, FileSpreadsheet, Printer, ShoppingBagIcon } from 'lucide-react';

export default function ReportsPage() {
    const { fetchReport, loading } = useReports();
    const [summary, setSummary] = useState<ReportSummary | null>(null);

    // Date Filter State
    const [periodType, setPeriodType] = useState<'month' | 'months_range' | 'date' | 'date_range'>('date_range');

    // State for specific inputs
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [monthSingle, setMonthSingle] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });

    // Range dates default to current month
    const [rangeDates, setRangeDates] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    // Month range defaults
    const [monthRange, setMonthRange] = useState({
        startMonth: new Date().getMonth(),
        startYear: new Date().getFullYear(),
        endMonth: new Date().getMonth(),
        endYear: new Date().getFullYear()
    });

    // Update the actual dateRange used for fetching whenever the specific inputs change
    useEffect(() => {
        switch (periodType) {
            case 'date': // Por fecha
                loadReport(selectedDate, selectedDate);
                return;

            case 'date_range': // Entre fechas
                loadReport(rangeDates.start, rangeDates.end);
                return;

            case 'month': // Por mes
                const mStart = new Date(monthSingle.year, monthSingle.month, 1);
                const mEnd = endOfMonth(mStart);
                loadReport(format(mStart, 'yyyy-MM-dd'), format(mEnd, 'yyyy-MM-dd'));
                return;

            case 'months_range': // Entre meses
                const mrStart = new Date(monthRange.startYear, monthRange.startMonth, 1);
                const mrEnd = endOfMonth(new Date(monthRange.endYear, monthRange.endMonth, 1));
                loadReport(format(mrStart, 'yyyy-MM-dd'), format(mrEnd, 'yyyy-MM-dd'));
                return;
        }
    }, [periodType, selectedDate, monthSingle, rangeDates, monthRange]);

    const loadReport = async (startStr?: string, endStr?: string) => {
        if (startStr && endStr) {
            const data = await fetchReport(startStr, endStr);
            setSummary(data);
        }
    };

    const formatMoney = (amount: number) => {
        return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const exportToExcel = () => {
        if (!summary) return;

        // Helper to get current label
        let periodLabel = '';
        if (periodType === 'date') periodLabel = selectedDate;
        else if (periodType === 'date_range') periodLabel = `${rangeDates.start} al ${rangeDates.end}`;
        else if (periodType === 'month') periodLabel = `${months[monthSingle.month]} ${monthSingle.year}`;
        else if (periodType === 'months_range') periodLabel = `${months[monthRange.startMonth]} ${monthRange.startYear} - ${months[monthRange.endMonth]} ${monthRange.endYear}`;

        const csvContent = [
            `Reporte Financiero - ${periodLabel}`,
            '',
            'Fecha;Efectivo (Mano);Yape/Plin;Tarjetas;Transferencias;VENTA TOTAL;Costo Ventas;Gastos Op.;UTILIDAD NETA DIA',
            ...summary.daily_stats.map(d => {
                return `${d.date};${d.cash_hand};${d.yape};${d.card};${d.transfer};${d.income};${d.cost_of_sales.toFixed(2)};${d.expense};${d.utility.toFixed(2)}`;
            })
        ].join('\n');

        // Add BOM (\uFEFF) so Excel recognizes it as UTF-8
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Reporte_FinanzasPro_${periodLabel.replace(/ /g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-fiori-header">Reportes Financieros</h1>
                    <p className="text-fiori-text-light">Resultados operativos y flujo de caja (P&L)</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm"
                        title="Descargar Excel"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-sm text-sm"
                        title="Imprimir o Guardar PDF"
                    >
                        <Printer className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                    <select
                        className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fiori-blue focus:border-transparent cursor-pointer"
                        value={periodType}
                        onChange={(e) => setPeriodType(e.target.value as any)}
                    >
                        <option value="month">Por mes</option>
                        <option value="months_range">Entre meses</option>
                        <option value="date">Por fecha</option>
                        <option value="date_range">Entre fechas</option>
                    </select>
                </div>

                {/* Conditional Inputs */}
                <div className="flex flex-wrap gap-4 items-end">

                    {/* POR MES */}
                    {periodType === 'month' && (
                        <div className="flex gap-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Mes</label>
                                <select
                                    className="fiori-input py-2"
                                    value={monthSingle.month}
                                    onChange={(e) => setMonthSingle(p => ({ ...p, month: Number(e.target.value) }))}>
                                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Año</label>
                                <select
                                    className="fiori-input py-2"
                                    value={monthSingle.year}
                                    onChange={(e) => setMonthSingle(p => ({ ...p, year: Number(e.target.value) }))}>
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* ENTRE MESES */}
                    {periodType === 'months_range' && (
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex gap-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Desde</label>
                                    <select
                                        className="fiori-input py-2"
                                        value={monthRange.startMonth}
                                        onChange={(e) => setMonthRange(p => ({ ...p, startMonth: Number(e.target.value) }))}>
                                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                                    <select
                                        className="fiori-input py-2"
                                        value={monthRange.startYear}
                                        onChange={(e) => setMonthRange(p => ({ ...p, startYear: Number(e.target.value) }))}>
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <span className="text-gray-400 self-center pt-4">-</span>
                            <div className="flex gap-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                                    <select
                                        className="fiori-input py-2"
                                        value={monthRange.endMonth}
                                        onChange={(e) => setMonthRange(p => ({ ...p, endMonth: Number(e.target.value) }))}>
                                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                                    <select
                                        className="fiori-input py-2"
                                        value={monthRange.endYear}
                                        onChange={(e) => setMonthRange(p => ({ ...p, endYear: Number(e.target.value) }))}>
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* POR FECHA */}
                    {periodType === 'date' && (
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="fiori-input w-48"
                            />
                        </div>
                    )}

                    {/* ENTRE FECHAS */}
                    {periodType === 'date_range' && (
                        <div className="flex items-center gap-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={rangeDates.start}
                                    onChange={(e) => setRangeDates(p => ({ ...p, start: e.target.value }))}
                                    className="fiori-input w-40"
                                />
                            </div>
                            <span className="text-gray-400 pt-5">-</span>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={rangeDates.end}
                                    onChange={(e) => setRangeDates(p => ({ ...p, end: e.target.value }))}
                                    className="fiori-input w-40"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {
                loading && !summary ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-fiori-blue border-t-transparent"></div>
                    </div>
                ) : summary ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-card border-l-4 border-green-500">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Venta Total (bruta)</span>
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{formatMoney(summary.total_income)}</div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-card border-l-4 border-orange-500">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Compras (Reposición)</span>
                                    <ShoppingBagIcon className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{formatMoney(summary.total_purchases)}</div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-card border-l-4 border-red-500">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Gastos Operativos</span>
                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{formatMoney(summary.total_operational_expenses)}</div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-card border-l-4 border-purple-500">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Gastos Fijos</span>
                                    <TrendingDown className="w-5 h-5 text-purple-500" />
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{formatMoney(summary.total_fixed_expenses)}</div>
                            </div>

                            <div className={`bg-white p-6 rounded-lg shadow-card border-l-4 ${summary.net_profit >= 0 ? 'border-fiori-blue' : 'border-red-600'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Utilidad Neta</span>
                                    <DollarSign className={`w-5 h-5 ${summary.net_profit >= 0 ? 'text-fiori-blue' : 'text-red-600'}`} />
                                </div>
                                <div className={`text-2xl font-bold ${summary.net_profit >= 0 ? 'text-fiori-blue' : 'text-red-600'}`}>
                                    {formatMoney(summary.net_profit)}
                                </div>
                            </div>
                        </div>

                        {/* Sales Report (Inv/Rec/Notes) */}
                        <div className="bg-white p-6 rounded-lg shadow-card">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-fiori-blue" />
                                Reporte de comprobantes
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col items-center text-center">
                                    <span className="text-indigo-600 font-medium mb-1 text-sm uppercase tracking-wider">Facturas</span>
                                    <span className="text-2xl font-bold text-gray-900">{formatMoney(summary.total_facturas)}</span>
                                </div>
                                <div className="p-4 bg-teal-50 rounded-lg border border-teal-100 flex flex-col items-center text-center">
                                    <span className="text-teal-600 font-medium mb-1 text-sm uppercase tracking-wider">Boletas</span>
                                    <span className="text-2xl font-bold text-gray-900">{formatMoney(summary.total_boletas)}</span>
                                </div>
                                <div className="p-4 bg-pink-50 rounded-lg border border-pink-100 flex flex-col items-center text-center">
                                    <span className="text-pink-600 font-medium mb-1 text-sm uppercase tracking-wider">Notas de Venta</span>
                                    <span className="text-2xl font-bold text-gray-900">{formatMoney(summary.total_notas_venta)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown by Method */}
                        <div className="bg-white p-6 rounded-lg shadow-card">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-fiori-blue" />
                                Desglose de Ingresos (Medios de Pago)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-sm text-blue-600 font-medium mb-1">Total efectivo</div>
                                    <div className="text-xl font-bold text-gray-900">{formatMoney(summary.income_by_method.cash_hand)}</div>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                    <div className="text-sm text-purple-600 font-medium mb-1">Total Yape</div>
                                    <div className="text-xl font-bold text-gray-900">{formatMoney(summary.income_by_method.yape)}</div>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                    <div className="text-sm text-orange-600 font-medium mb-1">Total Tarjetas</div>
                                    <div className="text-xl font-bold text-gray-900">{formatMoney(summary.income_by_method.card)}</div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-sm text-gray-600 font-medium mb-1">Total transferencia</div>
                                    <div className="text-xl font-bold text-gray-900">{formatMoney(summary.income_by_method.transfer)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Simple P&L Table */}
                        <div className="bg-white rounded-lg shadow-card overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Estado de Resultados (Simplificado)
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3 max-w-lg mx-auto">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="font-medium text-gray-700">(+) Ingresos Brutos</span>
                                        <span className="font-bold text-gray-900">{formatMoney(summary.total_income)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 text-red-600">
                                        <span className="font-medium">(-) Costo de Ventas (65%)</span>
                                        <span className="font-bold">({formatMoney(summary.total_cost_of_sales)})</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 bg-gray-50 px-2 rounded font-semibold text-gray-800">
                                        <span>(=) Utilidad Bruta</span>
                                        <span>{formatMoney(summary.total_income - summary.total_cost_of_sales)}</span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 text-red-600">
                                        <span className="font-medium">(-) Gastos Operativos</span>
                                        <span className="font-bold">({formatMoney(summary.total_operational_expenses)})</span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 text-purple-600">
                                        <span className="font-medium">(-) Gastos Fijos</span>
                                        <span className="font-bold">({formatMoney(summary.total_fixed_expenses)})</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 text-red-600">
                                        <span className="font-medium">(-) Comisiones (Tarjetas ~4%)</span>
                                        <span className="font-bold">({formatMoney(summary.total_commissions)})</span>
                                    </div>

                                    {/* Net Profit (Operating) */}
                                    <div className={`flex justify-between items-center py-3 mt-2 px-3 rounded-lg text-white font-bold text-lg ${summary.net_profit >= 0 ? 'bg-fiori-blue' : 'bg-red-600'}`}>
                                        <span>(=) UTILIDAD NETA</span>
                                        <span>{formatMoney(summary.net_profit)}</span>
                                    </div>

                                    {/* Other Flows (Non-Operating) */}
                                    {summary.total_other_income > 0 && (
                                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                                            <div className="flex justify-between items-center py-1 text-green-700 text-sm">
                                                <span className="font-medium flex items-center gap-1">
                                                    (+) Otros Ingresos (Préstamos/Etc)
                                                </span>
                                                <span className="font-bold">{formatMoney(summary.total_other_income)}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 italic text-right mt-1">
                                                No afecta la utilidad contable, pero suma a la caja.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
                        No se pudieron cargar los datos.
                    </div>
                )
            }
        </div >
    );
}


