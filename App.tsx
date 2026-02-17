
import React, { useState } from 'react';
import { useAppContext } from './hooks/useAppContext';
import Login from './components/Login';
import CompanySetup from './components/CompanySetup';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DocumentList from './components/DocumentList';
import ClientList from './components/ClientList';
import Reports from './components/Reports';
import DocumentEditor from './components/DocumentEditor';
import { Page, Document, DocumentType } from './types';

const App: React.FC = () => {
    const { isAuthenticated, companyInfo } = useAppContext();
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [newDocumentType, setNewDocumentType] = useState<DocumentType | null>(null);

    const handleNavigation = (page: Page) => {
        setEditingDocument(null);
        setNewDocumentType(null);
        setCurrentPage(page);
    };

    const handleEditDocument = (doc: Document) => {
        setEditingDocument(doc);
        setCurrentPage('editor');
    };
    
    const handleNewDocument = (type: DocumentType) => {
        setNewDocumentType(type);
        setEditingDocument(null);
        setCurrentPage('editor');
    }

    const handleBackFromEditor = () => {
        const targetPage = editingDocument?.type === 'invoice' 
            ? 'invoices' 
            : (editingDocument?.type === 'quotation' || newDocumentType === 'quotation')
            ? 'quotations' 
            : 'dashboard';
        handleNavigation(targetPage);
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard onEditDocument={handleEditDocument} />;
            case 'invoices':
                return <DocumentList type="invoice" onEditDocument={handleEditDocument} onNewDocument={handleNewDocument} />;
            case 'quotations':
                return <DocumentList type="quotation" onEditDocument={handleEditDocument} onNewDocument={handleNewDocument} />;
            case 'clients':
                return <ClientList />;
            case 'reports':
                return <Reports />;
            case 'editor':
                return <DocumentEditor document={editingDocument} newType={newDocumentType} onBack={handleBackFromEditor} />;
            default:
                return <Dashboard onEditDocument={handleEditDocument}/>;
        }
    };

    if (!isAuthenticated) {
        return <Login />;
    }

    if (!companyInfo) {
        return <CompanySetup />;
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 text-gray-100">
            <Sidebar onNavigate={handleNavigation} currentPage={currentPage} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {renderPage()}
            </main>
        </div>
    );
};

export default App;
