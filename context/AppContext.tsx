
import React, { createContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { AppContextType, Client, CompanyInfo, Document, DocumentStatus, DocumentType, InvoiceStatus, QuotationStatus } from '../types';

export const AppContext = createContext<AppContextType | null>(null);

// Helper to get initial state from localStorage
const getInitialState = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize state from localStorage or with default values
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getInitialState('isAuthenticated', false));
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(() => getInitialState('companyInfo', null));
    const [clients, setClients] = useState<Client[]>(() => getInitialState('clients', []));
    const [documents, setDocuments] = useState<Document[]>(() => getInitialState('documents', []));

    // Persist state to localStorage on change
    useEffect(() => {
        localStorage.setItem('isAuthenticated', JSON.stringify(isAuthenticated));
    }, [isAuthenticated]);

    useEffect(() => {
        localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
    }, [companyInfo]);
    
    useEffect(() => {
        localStorage.setItem('clients', JSON.stringify(clients));
    }, [clients]);

    useEffect(() => {
        localStorage.setItem('documents', JSON.stringify(documents));
    }, [documents]);

    const login = (password: string) => {
        if (password === 'password') {
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
    };

    const updateCompanyInfo = (info: CompanyInfo) => {
        setCompanyInfo(info);
    };

    const addClient = (client: Omit<Client, 'id'>) => {
        const newClient = { ...client, id: `cli_${Date.now()}` };
        setClients(prev => [...prev, newClient]);
    };

    const updateClient = (updatedClient: Client) => {
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    };
    
    const getClientById = (id: string) => clients.find(c => c.id === id);

    const getNextDocNumber = (type: DocumentType) => {
        const prefix = type === 'invoice' ? 'INV' : 'QUO';
        const relevantDocs = documents.filter(d => d.type === type);
        if (relevantDocs.length === 0) {
            return `${prefix}-001`;
        }
        const lastDoc = relevantDocs
            .sort((a, b) => parseInt(b.docNumber.split('-')[1]) - parseInt(a.docNumber.split('-')[1]))[0];
        const lastNum = lastDoc ? parseInt(lastDoc.docNumber.split('-')[1]) : 0;
        return `${prefix}-${(lastNum + 1).toString().padStart(3, '0')}`;
    }

    const addDocument = (doc: Omit<Document, 'id' | 'docNumber'>) => {
        const newDoc = { 
            ...doc,
            id: `doc_${Date.now()}`,
            docNumber: getNextDocNumber(doc.type)
        };
        setDocuments(prev => [...prev, newDoc]);
        return newDoc;
    };

    const updateDocument = (updatedDoc: Document) => {
        setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    };

    const deleteDocument = (id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
    };
    
    const updateDocumentStatus = (id: string, status: DocumentStatus) => {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    };

    const convertQuoteToInvoice = (quoteId: string) => {
        const quote = documents.find(d => d.id === quoteId && d.type === 'quotation');
        if (!quote || quote.status !== 'Accepted') return undefined;

        const newInvoiceData: Omit<Document, 'id' | 'docNumber'> = {
            type: 'invoice',
            clientId: quote.clientId,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: quote.items.map(item => ({...item, id: `item_${Date.now()}_${Math.random()}`})),
            terms: quote.terms,
            status: 'Draft' as InvoiceStatus,
        };
        
        const newInvoice = addDocument(newInvoiceData);
        updateDocumentStatus(quoteId, 'Accepted' as QuotationStatus); // keep it as accepted
        return newInvoice;
    };


    const value = useMemo(() => ({
        isAuthenticated,
        companyInfo,
        clients,
        documents,
        login,
        logout,
        updateCompanyInfo,
        addClient,
        updateClient,
        getClientById,
        addDocument,
        updateDocument,
        deleteDocument,
        updateDocumentStatus,
        convertQuoteToInvoice,
    }), [isAuthenticated, companyInfo, clients, documents]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
