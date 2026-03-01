import React, { createContext, useState, useMemo, ReactNode, useEffect, useCallback } from 'react';
import { AppContextType, Client, CompanyInfo, Document, DocumentStatus, User } from '../types';
import { api, clearToken, hasToken, setToken } from '../services/api';

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);

    const bootstrapData = useCallback(async () => {
        try {
            const [meData, clientsData, documentsData] = await Promise.all([
                api.me(),
                api.getClients(),
                api.getDocuments(),
            ]);

            setCurrentUser(meData.user);
            setCompanyInfo(meData.company);
            setClients(clientsData);
            setDocuments(documentsData);
            setIsAuthenticated(true);
        } catch {
            clearToken();
            setIsAuthenticated(false);
            setCurrentUser(null);
            setCompanyInfo(null);
            setClients([]);
            setDocuments([]);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            if (hasToken()) {
                await bootstrapData();
            }
            setLoading(false);
        };

        init();
    }, [bootstrapData]);

    const login = async (email: string, password: string) => {
        try {
            const data = await api.login({ email, password });
            setToken(data.token);
            setCurrentUser(data.user);
            setCompanyInfo(data.company);
            await bootstrapData();
            return true;
        } catch {
            return false;
        }
    };

    const signup = async (payload: { name: string; email: string; password: string; companyName?: string }) => {
        try {
            const data = await api.signup(payload);
            setToken(data.token);
            setCurrentUser(data.user);
            setCompanyInfo(data.company);
            await bootstrapData();
            return true;
        } catch {
            return false;
        }
    };

    const logout = () => {
        clearToken();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCompanyInfo(null);
        setClients([]);
        setDocuments([]);
    };

    const updateCompanyInfo = async (info: CompanyInfo) => {
        const updated = await api.updateCompany(info);
        setCompanyInfo(updated);
    };

    const addClient = async (client: Omit<Client, 'id'>) => {
        const created = await api.createClient(client);
        setClients(prev => [...prev, created]);
    };

    const updateClient = async (updatedClient: Client) => {
        const updated = await api.updateClient(updatedClient.id, updatedClient);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    };

    const getClientById = (id: string) => clients.find(c => c.id === id);

    const addDocument = async (doc: Omit<Document, 'id' | 'docNumber'>) => {
        const created = await api.createDocument(doc);
        setDocuments(prev => [...prev, created]);
        return created;
    };

    const updateDocument = async (updatedDoc: Document) => {
        const updated = await api.updateDocument(updatedDoc.id, updatedDoc);
        setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    };

    const deleteDocument = async (id: string) => {
        await api.deleteDocument(id);
        setDocuments(prev => prev.filter(d => d.id !== id));
    };

    const updateDocumentStatus = async (id: string, status: DocumentStatus, force = true) => {
        const updated = await api.updateDocumentStatus(id, status, force);
        setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    };

    const convertQuoteToInvoice = async (quoteId: string, payload?: { items?: { lineItemId: string; quantity: number }[]; callbackPath?: string }) => {
        const response = await api.convertQuoteToInvoice(quoteId, payload);
        const invoice = response?.invoice;
        const quotation = response?.quotation;

        if (!invoice) return undefined;

        setDocuments(prev => {
            const withoutInvoiceDup = prev.filter(d => d.id !== invoice.id);
            const synced = quotation
                ? withoutInvoiceDup.map(d => d.id === quotation.id ? quotation : d)
                : withoutInvoiceDup;
            return [...synced, invoice];
        });

        return invoice;
    };

    const value = useMemo(() => ({
        isAuthenticated,
        loading,
        currentUser,
        companyInfo,
        clients,
        documents,
        login,
        signup,
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
    }), [isAuthenticated, loading, currentUser, companyInfo, clients, documents]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
