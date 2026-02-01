import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkerDashboard() {
    const { profile } = useAuth();
    const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-fiori-header">Cierre de Caja</h1>
                    <p className="text-fiori-text-light capitalize">{today}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Encargado actual</p>
                    <p className="font-medium text-fiori-blue">{profile?.full_name || 'Usuario'}</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center mt-12">
                <div className="w-full max-w-md">
                    <Link to="/worker/incomes/new" className="fiori-card hover:border-fiori-blue group flex flex-col items-center gap-6 p-10 text-center transition-all shadow-lg hover:shadow-xl border-2 border-transparent">
                        <div className="bg-green-100 p-6 rounded-full text-green-600 group-hover:scale-110 transition-transform shadow-sm">
                            <PlusCircle className="w-16 h-16" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Registrar Ingresos</h3>
                            <p className="text-gray-500">Haz clic aquí para realizar el cierre de caja diario</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
