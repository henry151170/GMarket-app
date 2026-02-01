
import { useCashFlowForecast } from '../../hooks/useCashFlowForecast';
import { format, startOfMonth, getDay, isToday } from 'date-fns';

import { TrendingUp, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';

export default function CashFlowCalendar() {
    const { loading, avgDailyIncome, projection, recommendations } = useCashFlowForecast();

    if (loading) return <div className="p-8 text-center text-gray-500">Calculando proyecciones...</div>;

    // Helper to align grid start
    const firstDayOfMonth = startOfMonth(new Date());
    const startDayOfWeek = getDay(firstDayOfMonth); // 0 = Sunday
    // Adjustable offset if week starts on Monday, etc. Let's assume Sunday start for simplicity or adjust.
    // Standard calendar usually starts Sunday(0) or Monday(1). Let's use Sunday.

    return (
        <div className="space-y-6">
            {/* HEAD SATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Venta Promedio Diaria</p>
                        <h3 className="text-xl font-bold text-gray-800">S/ {avgDailyIncome.toFixed(2)}</h3>
                        <p className="text-xs text-green-600">Basado en últimos 15 días</p>
                    </div>
                </div>

                {recommendations.length > 0 && (
                    <div className="md:col-span-2 bg-amber-50 p-4 rounded-lg border border-amber-100 flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-amber-800 mb-1">Recomendaciones del Sistema</h4>
                            <ul className="list-disc pl-4 text-sm text-amber-700 space-y-1">
                                {recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* CALENDAR */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-fiori-blue" />
                        Proyección {format(new Date(), 'MMMM yyyy')}
                    </h3>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div> Riesgo</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div> Excedente</div>
                    </div>
                </div>

                {/* Grid Header */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
                </div>

                {/* Grid Body */}
                <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                    {/* Empty cells for previous month */}
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-white min-h-[100px]" />
                    ))}

                    {projection.map((day, idx) => {
                        const hasExpenses = day.fixed_expenses.length > 0;
                        // Color coding Logic
                        // If net flow is negative for the day (big expense), highlight expense
                        // If running balance is negative, background red
                        let bgClass = "bg-white";
                        if (day.running_balance < 0) bgClass = "bg-red-50";
                        else if (day.net_flow < 0) bgClass = "bg-orange-50/30"; // Warning day
                        else bgClass = "bg-white";

                        if (isToday(day.date)) bgClass += " ring-2 ring-inset ring-blue-400";

                        return (
                            <div key={idx} className={`${bgClass} p-2 min-h-[120px] relative hover:bg-gray-50 transition-colors flex flex-col`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-sm font-bold ${isToday(day.date) ? 'text-blue-600' : 'text-gray-700'}`}>
                                        {format(day.date, 'd')}
                                    </span>
                                    {/* Small balance indicator */}
                                    <span className={`text-[10px] font-mono px-1 rounded ${day.running_balance < 0 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'}`}>
                                        {day.running_balance >= 0 ? '+' : ''}{Math.round(day.running_balance)}
                                    </span>
                                </div>

                                <div className="space-y-1 flex-1">
                                    {/* Income Indicator */}
                                    <div className={`text-[10px] flex justify-between items-center px-1 rounded ${day.is_projected ? 'text-gray-400 italic bg-gray-50' : 'text-green-700 bg-green-50 border border-green-100'}`}>
                                        <span>{day.is_projected ? 'Est.' : 'Venta'}</span>
                                        <span className="font-medium">S/ {Math.round(day.income_projected)}</span>
                                    </div>

                                    {hasExpenses && day.fixed_expenses.map(exp => (
                                        <div key={exp.id} className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 truncate" title={`${exp.title} - ${exp.amount}`}>
                                            -{exp.currency === 'USD' ? '$' : 'S/'}{exp.amount} <span className="opacity-75">{exp.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-gray-400 text-center italic">
                * Esta proyección asume que las ventas diarias se mantienen en el promedio de S/ {avgDailyIncome.toFixed(2)} y que los gastos fijos se pagan en su fecha programada.
            </p>
        </div>
    );
}
