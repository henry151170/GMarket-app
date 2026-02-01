import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
    const location = useLocation();

    return (
        <div className="flex h-screen bg-fiori-bg overflow-hidden">
            {/* Sidebar with high Z-index to ensure clickable */}
            <Sidebar />

            <main className="flex-1 overflow-y-auto p-8 relative z-0">
                <Outlet key={location.pathname} />
            </main>
        </div>
    );
}
