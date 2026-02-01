import { useFinancialHealth } from '../../hooks/useFinancialHealth';
import { ShieldCheck, TrendingUp, AlertTriangle, Wallet, ArrowRight, PiggyBank } from 'lucide-react';

export default function FinancialHealthPage() {
    const { liquidity, obligations, projections, loading } = useFinancialHealth();

    const formatMoney = (amount: number) => {
        return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) return <div className="p-10 text-center">Analizando finanzas...</div>;

    const safeToInvest = liquidity.total - obligations.totalReserved;
    const isRisk = projections.projectedBalance30d < 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-fiori-header">Salud Financiera & Liquidez</h1>
                <p className="text-fiori-text-light">Análisis de solvencia y proyecciones de caja</p>
            </div>

            {/* Top Liquidity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Real Liquidity */}
                <div className="bg-white p-6 rounded-lg shadow-card border-t-4 border-blue-500">
                    <h3 className="text-gray-500 font-medium flex items-center gap-2 mb-4">
                        <Wallet className="w-5 h-5 text-blue-500" />
                        Liquidez Total (Hoy)
                    </h3>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{formatMoney(liquidity.total)}</div>
                    <div className="flex justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span>Caja: {formatMoney(liquidity.cashHand)}</span>
                        <span>Banco: {formatMoney(liquidity.cashBank)}</span>
                    </div>
                </div>

                {/* 2. Commitments (Reserve) */}
                <div className="bg-white p-6 rounded-lg shadow-card border-t-4 border-orange-500">
                    <h3 className="text-gray-500 font-medium flex items-center gap-2 mb-4">
                        <PiggyBank className="w-5 h-5 text-orange-500" />
                        Reserva Sugerida (Gastos Fijos)
                    </h3>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{formatMoney(obligations.totalReserved)}</div>
                    <p className="text-sm text-gray-500">
                        Basado en tus gastos fijos promedio (Alquiler, Servicios, Planilla).
                        <br />Se recomienda mantener este monto intocable.
                    </p>
                </div>

                {/* 3. Safe to Invest */}
                <div className={`bg-white p-6 rounded-lg shadow-card border-t-4 ${safeToInvest > 0 ? 'border-green-500' : 'border-red-500'}`}>
                    <h3 className="text-gray-500 font-medium flex items-center gap-2 mb-4">
                        <ShieldCheck className={`w-5 h-5 ${safeToInvest > 0 ? 'text-green-500' : 'text-red-500'}`} />
                        Saldo Seguro para Invertir
                    </h3>
                    <div className={`text-3xl font-bold mb-2 ${safeToInvest > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMoney(safeToInvest)}
                    </div>
                    <p className="text-sm text-gray-500">
                        {safeToInvest > 0
                            ? "Excedente disponible después de cubrir obligaciones fijas."
                            : "⚠️ Cuidado: Tu liquidez actual no cubre un mes de gastos fijos."}
                    </p>
                </div>
            </div>

            {/* Projections */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-fiori-blue" />
                        Proyección de Flujo de Caja (Próximos 30 días)
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Basado en el rendimiento de los últimos 30 días, si el negocio sigue igual:
                        </p>

                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Promedio Venta Diaria</span>
                            <span className="font-semibold text-green-600">+{formatMoney(projections.avgDailySales)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Costo Diario (Var + Fijos)</span>
                            <span className="font-semibold text-red-600">-{formatMoney(projections.avgDailySales - projections.avgDailyProfit)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-blue-50 px-2 rounded font-bold">
                            <span className="text-blue-800">Flujo Neto Diario Promedio</span>
                            <span className="text-blue-800">{formatMoney(projections.avgDailyProfit)}</span>
                        </div>
                    </div>

                    <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-2">Saldo Proyectado (30 días)</p>
                        <div className={`text-4xl font-bold mb-4 ${isRisk ? 'text-red-600' : 'text-green-600'}`}>
                            {formatMoney(projections.projectedBalance30d)}
                        </div>

                        {isRisk ? (
                            <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-2 rounded">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="font-bold text-sm">ALERTA: Riesgo de iliquidez</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                                <ArrowRight className="w-5 h-5" />
                                <span className="font-bold text-sm">Tendencia Positiva</span>
                            </div>
                        )}

                        <div className="mt-4 text-xs text-gray-400">
                            Runway (Supervivencia sin ventas):
                            <span className="font-bold text-gray-600 ml-1">{projections.daysRunway} días</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
