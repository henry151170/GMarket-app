import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppLayout() {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-fiori-bg overflow-hidden flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-fiori-header text-white p-4 flex items-center justify-between shadow-md z-20">
                <h1 className="font-bold text-lg">GMarket</h1>
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
