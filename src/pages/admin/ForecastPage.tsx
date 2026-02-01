
import CashFlowCalendar from '../../components/forecast/CashFlowCalendar';
import { Calendar } from 'lucide-react';

export default function ForecastPage() {
    return (
        <div className="space-y-6">
            <div className="flex md:flex-row flex-col justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-fiori-blue" />
                        Calendario de Flujo de Caja
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Visualiza tus ingresos y gastos fijos para anticipar faltantes de efectivo.
                    </p>
                </div>
            </div>

            <CashFlowCalendar />
        </div>
    );
}
