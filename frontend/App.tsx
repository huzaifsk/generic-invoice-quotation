
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAppContext } from './hooks/useAppContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import Signup from './components/Signup';
import CompanySetup from './components/CompanySetup';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DocumentList from './components/DocumentList.tsx';
import ClientList from './components/ClientList';
import Reports from './components/Reports';
import DocumentEditor from './components/DocumentEditor';
import UserManagement from './components/UserManagement';
import Catalog from './components/Catalog';
import Payments from './components/Payments';
import CreditNotes from './components/CreditNotes';
import NotificationsCenter from './components/NotificationsCenter';
import ActivityLog from './components/ActivityLog';
import Settings from './components/Settings';
import ProtectedRoute from './components/routes/ProtectedRoute';
import { Document, DocumentType } from './types';
import { applyTheme, getStoredTheme } from './utils/theme';
import { HugeiconsIcon } from '@hugeicons/react';
import { PanelRightCloseIcon } from '@hugeicons/core-free-icons';

const AppRouter: React.FC = () => {
    const { isAuthenticated, companyInfo, loading, currentUser } = useAppContext();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));
    const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [newDocumentType, setNewDocumentType] = useState<DocumentType | null>(null);

    useEffect(() => {
        const themeFromCompany = companyInfo?.templates?.theme;
        const storedTheme = getStoredTheme();
        applyTheme(themeFromCompany || storedTheme || 'light');
    }, [companyInfo]);

    useEffect(() => {
        const onResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        window.addEventListener('resize', onResize);
        onResize();
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const handleEditDocument = (doc: Document) => {
        setEditingDocument(doc);
        setNewDocumentType(null);
        navigate('/editor');
    };

    const handleNewDocument = (type: DocumentType) => {
        setNewDocumentType(type);
        setEditingDocument(null);
        navigate('/editor');
    };

    const handleBackFromEditor = () => {
        setEditingDocument(null);
        setNewDocumentType(null);
        navigate('/dashboard');
    };

    const handleInvoiceCreatedFromQuote = (invoice: Document) => {
        setEditingDocument(invoice);
        setNewDocumentType(null);
        navigate('/editor');
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    if (!companyInfo || !companyInfo.name || !companyInfo.trn) {
        return (
            <Routes>
                <Route path="/setup" element={<CompanySetup />} />
                <Route path="*" element={<Navigate to="/setup" replace />} />
            </Routes>
        );
    }

    return (
        <div className="ui-page flex">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isMobile={isMobile} />
            {isMobile && sidebarOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="fixed inset-0 z-40 bg-black/30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <main className={`flex-1 overflow-x-hidden p-2 sm:p-6 lg:p-10 transition-all duration-300 ml-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                <div className="max-w-6xl mx-auto w-full min-w-0">
                    <div className="mb-3 flex items-center justify-between rounded-2xl border border-(--border-soft) bg-(--bg-surface) px-3 py-2.5 lg:hidden">
                        <p className="text-sm font-semibold text-(--text-strong) truncate max-w-[70%]">{companyInfo?.name || 'Invoice Suite'}</p>
                        <button
                            type="button"
                            className="ui-btn-secondary ui-focus-ring h-9 w-9 p-0"
                            onClick={() => setSidebarOpen((prev) => !prev)}
                            aria-label="Open menu"
                        >
                            <HugeiconsIcon icon={PanelRightCloseIcon} size={16} className="h-4 w-4" aria-hidden />
                        </button>
                    </div>
                    <Routes>
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard onEditDocument={handleEditDocument} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices"
                            element={
                                <ProtectedRoute>
                                    <DocumentList
                                        type="invoice"
                                        onEditDocument={handleEditDocument}
                                        onNewDocument={handleNewDocument}
                                    />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/quotations"
                            element={
                                <ProtectedRoute>
                                    <DocumentList
                                        type="quotation"
                                        onEditDocument={handleEditDocument}
                                        onNewDocument={handleNewDocument}
                                    />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/clients"
                            element={
                                <ProtectedRoute>
                                    <ClientList />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/reports"
                            element={
                                <ProtectedRoute>
                                    <Reports />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/users"
                            element={
                                <ProtectedRoute>
                                    {currentUser?.role === 'admin' ? <UserManagement /> : <Navigate to="/dashboard" replace />}
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
                        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                        <Route path="/credit-notes" element={<ProtectedRoute><CreditNotes /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationsCenter /></ProtectedRoute>} />
                        <Route path="/activity" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route
                            path="/editor"
                            element={
                                <ProtectedRoute>
                                    <DocumentEditor
                                        document={editingDocument}
                                        newType={newDocumentType}
                                        onBack={handleBackFromEditor}
                                        onInvoiceCreated={handleInvoiceCreatedFromQuote}
                                    />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <Router>
                <AppRouter />
            </Router>
        </ErrorBoundary>
    );
};

export default App;
