import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3,
    Users,
    Wallet,
    ShoppingCart,
    Receipt,
    ArrowLeftRight,
    Settings,
    LogOut,
    LayoutDashboard,
    ClipboardList,
    History,

    Activity,
    Calendar
} from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
    const { profile, signOut } = useAuth();
    const location = useLocation();

    const adminLinks = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/forecast', icon: Calendar, label: 'Proyección Flujo' },
        { to: '/admin/reports', icon: BarChart3, label: 'Reportes P&G' },
        { to: '/admin/financial-health', icon: Activity, label: 'Salud Financiera' },
        { to: '/admin/incomes', icon: Wallet, label: 'Ingresos' },
        { to: '/admin/expenses', icon: Receipt, label: 'Gastos' },
        { to: '/admin/purchases', icon: ShoppingCart, label: 'Compras' },
        { to: '/admin/transfers', icon: ArrowLeftRight, label: 'Transferencias' },
        { to: '/admin/other-incomes', icon: ClipboardList, label: 'Otros Ingresos' },
        { to: '/admin/users', icon: Users, label: 'Usuarios' },
        { to: '/admin/settings', icon: Settings, label: 'Configuración' },
    ];

    const workerLinks = [
        { to: '/worker', icon: LayoutDashboard, label: 'Cierre de Caja' },
        { to: '/worker/history', icon: History, label: 'Mi Historial' },
    ];

    const links = profile?.role === 'admin' ? adminLinks : workerLinks;

    return (
        <div className="flex flex-col h-full bg-fiori-header text-white w-64 shadow-xl relative z-50">
            <div className="p-6 border-b border-gray-700">
                <h1 className="text-xl font-bold">GMarket</h1>
                <p className="text-xs text-gray-400 mt-1">{profile?.role === 'admin' ? 'Administrador' : 'Encargado'}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.to;

                    return (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium",
                                isActive
                                    ? "bg-fiori-blue text-white shadow-sm"
                                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-300 hover:bg-red-900/30 hover:text-red-400 rounded-md transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
