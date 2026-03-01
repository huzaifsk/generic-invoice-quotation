import React, { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Page } from '../../types';

const pageMap: Record<string, Page> = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/invoices': 'invoices',
    '/quotations': 'quotations',
    '/clients': 'clients',
    '/reports': 'reports',
};

interface MainLayoutProps {
    children: ReactNode;
    onNavigate: (page: Page) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, onNavigate }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const currentPage = pageMap[location.pathname] || 'dashboard';

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar
                onNavigate={onNavigate}
                currentPage={currentPage}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />
            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
