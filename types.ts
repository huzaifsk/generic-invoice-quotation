
export interface CompanyInfo {
    name: string;
    logo?: string;
    trn: string;
    vatPercent: number;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    address: string;
}

export interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

export type DocumentType = 'invoice' | 'quotation';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';
export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
export type DocumentStatus = InvoiceStatus | QuotationStatus;


export interface Document {
    id: string;
    docNumber: string;
    type: DocumentType;
    clientId: string;
    issueDate: string;
    dueDate: string;
    items: LineItem[];
    terms?: string;
    status: DocumentStatus;
}

export type Page = 'dashboard' | 'invoices' | 'quotations' | 'clients' | 'reports' | 'editor';

export interface AppContextType {
    isAuthenticated: boolean;
    companyInfo: CompanyInfo | null;
    clients: Client[];
    documents: Document[];
    login: (password: string) => boolean;
    logout: () => void;
    updateCompanyInfo: (info: CompanyInfo) => void;
    addClient: (client: Omit<Client, 'id'>) => void;
    updateClient: (client: Client) => void;
    getClientById: (id: string) => Client | undefined;
    addDocument: (doc: Omit<Document, 'id' | 'docNumber'>) => Document;
    updateDocument: (doc: Document) => void;
    deleteDocument: (id: string) => void;
    updateDocumentStatus: (id: string, status: DocumentStatus) => void;
    convertQuoteToInvoice: (quoteId: string) => Document | undefined;
}
