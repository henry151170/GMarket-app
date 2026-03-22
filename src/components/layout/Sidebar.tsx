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

interface SidebarProps {
    onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
    const { profile, signOut } = useAuth();
    const location = useLocation();

    // Dynamic Branding
    const appName = import.meta.env.VITE_APP_NAME || 'GMarket';
    const normalizedAppName = appName.toLowerCase();
    const isGMarket = normalizedAppName === 'gmarket';
    const isGMobile = normalizedAppName === 'gmobile';
    const isSafri = normalizedAppName === 'safri';
    const isCustomBranding = isGMarket || isGMobile || isSafri;

    const sidebarBg = isGMarket || isGMobile ? 'bg-gray-900' : isSafri ? 'bg-purple-950' : 'bg-fiori-header';
    const hoverColor = isGMarket || isGMobile ? 'hover:bg-gray-800' : isSafri ? 'hover:bg-purple-900' : 'hover:bg-gray-700';

    const imgSrc = isGMarket ? '/logo.png' : isGMobile ? '/logo-gmobile.png' : isSafri ? '/logo-safri.jpg' : '';

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
        { to: '/worker/expenses/new', icon: Receipt, label: 'Gastos' },
        { to: '/worker/purchases', icon: ShoppingCart, label: 'Compras' },
        { to: '/worker/history', icon: History, label: 'Mi Historial' },
    ];

    const links = profile?.role === 'admin' ? adminLinks : workerLinks;

    const fallbackBg = isGMarket || isGMobile ? '#111827' : isSafri ? '#2e1065' : '#354a5f';
    const activeHex = isGMarket ? '#f97316' : isGMobile ? '#eab308' : isSafri ? '#9333ea' : '#0a6ed1';

    return (
        <div className={`flex flex-col h-full ${sidebarBg} text-white w-64 shadow-xl relative z-50`} style={{ backgroundColor: fallbackBg }}>
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <div className="w-full flex flex-col items-center mb-2">
                    {isCustomBranding ? (
                        <img src={imgSrc} alt={appName} className="w-48 h-auto object-contain mb-4 drop-shadow-md" />
                    ) : (
                        <h1 className="text-xl font-bold mb-2">{appName}</h1>
                    )}
                    <p className={`text-sm ${isCustomBranding ? 'text-gray-400' : 'text-gray-300'}`}>
                        {profile?.role === 'admin' ? 'Administrador' : 'Encargado'}
                    </p>
                </div>
                {/* Close button for mobile within sidebar (optional but good context) */}
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.to;

                    return (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={onClose} // Close sidebar on mobile when navigating
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium",
                                isActive
                                    ? `text-white shadow-sm`
                                    : `text-gray-300 ${hoverColor} hover:text-white`
                            )}
                            style={isActive ? { backgroundColor: activeHex } : {}}
                        >
                            <Icon className="w-5 h-5" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={() => {
                        signOut();
                        if (onClose) onClose();
                    }}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-300 hover:bg-red-900/30 hover:text-red-400 rounded-md transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
