
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    AnalyticsIcon,
    PanelRightCloseIcon,
    PanelLeftOpenIcon,
    DashboardCircleIcon,
    InvoiceIcon,
    LogoutIcon,
    QuoteUpIcon,
    UserGroupIcon,
} from '@hugeicons/core-free-icons';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isMobile: boolean;
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
        className={`flex items-center w-full gap-3 px-4 py-3 text-sm rounded-lg transition-all duration-200 relative ${
            isActive
                ? 'font-semibold text-(--primary-500) bg-(--primary-50)'
                : 'text-(--text-muted) hover:text-(--primary-500) hover:bg-(--primary-50)/60'
        }`}
    >
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-(--primary-300) rounded-r" />}
        <span className="text-current">{icon}</span>
        <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
            {label}
        </span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isMobile }) => {
    const { logout, companyInfo, currentUser } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: <HugeiconsIcon icon={DashboardCircleIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/invoices', label: 'Invoices', icon: <HugeiconsIcon icon={InvoiceIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/quotations', label: 'Quotations', icon: <HugeiconsIcon icon={QuoteUpIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/clients', label: 'Clients', icon: <HugeiconsIcon icon={UserGroupIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/catalog', label: 'Catalog', icon: <HugeiconsIcon icon={InvoiceIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/payments', label: 'Payments', icon: <HugeiconsIcon icon={AnalyticsIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/credit-notes', label: 'Credit Notes', icon: <HugeiconsIcon icon={QuoteUpIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/reports', label: 'Reports', icon: <HugeiconsIcon icon={AnalyticsIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/notifications', label: 'Notifications', icon: <HugeiconsIcon icon={UserGroupIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/activity', label: 'Activity Log', icon: <HugeiconsIcon icon={DashboardCircleIcon} size={20} className="h-5 w-5" aria-hidden /> },
        { path: '/settings', label: 'Settings', icon: <HugeiconsIcon icon={AnalyticsIcon} size={20} className="h-5 w-5" aria-hidden /> },
    ];
    if (currentUser?.role === 'admin') {
        navItems.push({ path: '/users', label: 'Users', icon: <HugeiconsIcon icon={UserGroupIcon} size={20} className="h-5 w-5" aria-hidden /> });
    }

    return (
        <aside
            className={`fixed top-0 left-0 h-full bg-(--bg-surface) text-(--text-strong) border-r border-(--border-soft) flex flex-col transition-all duration-300 z-50 shadow-sm ${
                isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:translate-x-0 lg:w-20'
            }`}
        >
            <header className="flex items-center justify-between px-4 py-5 border-b border-(--border-soft) h-20">
                <div className={`flex items-center gap-3 ${!isOpen ? 'mx-auto' : ''}`}>
                    {companyInfo?.logo ? (
                        <img src={companyInfo.logo} alt="logo" className="h-10 w-10 rounded-lg object-cover border border-(--border-soft)" />
                    ) : (
                        <div className="h-10 w-10 rounded-lg border border-(--border-soft) bg-linear-to-br from-(--primary-50) to-(--primary-100) flex items-center justify-center font-semibold text-sm text-(--primary-500)">
                            {companyInfo?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <div className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        <p className="text-sm font-semibold leading-tight">
                            {companyInfo?.name || 'Invoice Suite'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-2 rounded-lg border border-(--border-soft) text-(--text-muted) hover:text-(--primary-500) hover:bg-(--primary-50) transition-all duration-200 ${!isOpen ? 'ml-10' : 'ml-0'}`}
                    aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    title={isOpen ? 'Collapse' : 'Expand'}
                >
                    <HugeiconsIcon 
                        icon={isOpen ? PanelLeftOpenIcon : PanelRightCloseIcon  } 
                        size={18} 
                        className="h-4.5 w-4.5" 
                        aria-hidden 
                    />
                </button>
            </header>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navItems.map(item => (
                    <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        isActive={location.pathname === item.path}
                        onClick={() => {
                            navigate(item.path);
                            if (isMobile) setIsOpen(false);
                        }}
                        isSidebarOpen={isOpen}
                    />
                ))}
            </nav>
            <div className="px-2 py-4 border-t border-(--border-soft) space-y-2">
                <NavItem
                    icon={<HugeiconsIcon icon={LogoutIcon} size={20} className="h-5 w-5" aria-hidden />}
                    label="Logout"
                    isActive={false}
                    onClick={() => {
                        logout();
                        navigate('/login');
                        if (isMobile) setIsOpen(false);
                    }}
                    isSidebarOpen={isOpen}
                />
            </div>
        </aside>
    );
};

export default Sidebar;
