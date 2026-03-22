import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppLayout() {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Dynamic Branding
    const appName = import.meta.env.VITE_APP_NAME || 'GMarket';
    const normalizedAppName = appName.toLowerCase();
    const isGMarket = normalizedAppName === 'gmarket';
    const isGMobile = normalizedAppName === 'gmobile';
    const isSafri = normalizedAppName === 'safri';
    const isCustomBranding = isGMarket || isGMobile || isSafri;

    const headerBg = isGMarket || isGMobile ? 'bg-gray-900' : isSafri ? 'bg-purple-950' : 'bg-fiori-header';
    const imgSrc = isGMarket ? '/logo.png' : isGMobile ? '/logo-gmobile.png' : isSafri ? '/logo-safri.jpg' : '';

    const fallbackBg = isGMarket || isGMobile ? '#111827' : isSafri ? '#2e1065' : '#354a5f';

    return (
        <div className="flex h-screen bg-fiori-bg overflow-hidden flex-col md:flex-row">
            {/* Mobile Header */}
            <div className={`md:hidden ${headerBg} text-white p-4 flex items-center justify-between shadow-md z-20`} style={{ backgroundColor: fallbackBg }}>
                {isCustomBranding ? (
                    <img src={imgSrc} alt={appName} className="h-20 w-auto object-contain" />
                ) : (
                    <h1 className="font-bold text-lg">{appName}</h1>
                )}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-white/10 rounded-md transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Sidebar with Responsive Logic */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </div>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0 w-full">
                <Outlet key={location.pathname} />
            </main>
        </div>
    );
}
