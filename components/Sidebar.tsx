
import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Page } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import InvoiceIcon from './icons/InvoiceIcon';
import QuotationIcon from './icons/QuotationIcon';
import ClientIcon from './icons/ClientIcon';
import ReportsIcon from './icons/ReportsIcon';
import LogoutIcon from './icons/LogoutIcon';

interface SidebarProps {
    onNavigate: (page: Page) => void;
    currentPage: Page;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isSidebarOpen: boolean;
}> = ({ icon, label, isActive, onClick, isSidebarOpen }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        <span className={`ml-4 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentPage, isOpen, setIsOpen }) => {
    const { logout, companyInfo } = useAppContext();
    const navItems = [
        { page: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-6 w-6" /> },
        { page: 'invoices', label: 'Invoices', icon: <InvoiceIcon className="h-6 w-6" /> },
        { page: 'quotations', label: 'Quotations', icon: <QuotationIcon className="h-6 w-6" /> },
        { page: 'clients', label: 'Clients', icon: <ClientIcon className="h-6 w-6" /> },
        { page: 'reports', label: 'Reports', icon: <ReportsIcon className="h-6 w-6" /> },
    ];

    return (
        <aside className={`fixed top-0 left-0 h-full bg-slate-900/70 backdrop-blur-xl border-r border-slate-100/10 text-white flex flex-col transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-20'}`}>
            <div className={`flex items-center justify-between p-4 border-b border-slate-100/10 h-20`}>
                <div className={`flex items-center ${!isOpen && 'w-full justify-center'}`}>
                    {companyInfo?.logo ? (
                        <img src={companyInfo.logo} alt="logo" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xl">
                            {companyInfo?.name.charAt(0)}
                        </div>
                    )}
                    <h1 className={`ml-3 text-xl font-bold whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>{companyInfo?.name}</h1>
                </div>
                <button onClick={() => setIsOpen(!isOpen)} className={`absolute -right-3 top-7 bg-gray-700 p-1 rounded-full text-white/80 hover:bg-gray-600 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map(item => (
                    <NavItem 
                        key={item.page}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentPage === item.page}
                        onClick={() => onNavigate(item.page as Page)}
                        isSidebarOpen={isOpen}
                    />
                ))}
            </nav>
            <div className="p-4 border-t border-slate-100/10">
                <NavItem 
                    icon={<LogoutIcon className="h-6 w-6" />}
                    label="Logout"
                    isActive={false}
                    onClick={logout}
                    isSidebarOpen={isOpen}
                />
            </div>
        </aside>
    );
};

export default Sidebar;
