
export interface CompanyInfo {
    name: string;
    logo?: string;
    trn: string;
    vatPercent: number;
    currency?: string;
    paymentTermsDays?: number;
    defaultTaxPercent?: number;
    approvalThreshold?: number;
    templates?: {
        quote?: string;
        invoice?: string;
        brandColor?: string;
        theme?: 'light' | 'dark';
        rolePermissions?: Partial<Record<UserRole, string[]>>;
        [key: string]: unknown;
    };
    id?: string;
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
    taxPercent?: number;
    discountPercent?: number;
}

export type DocumentType = 'invoice' | 'quotation';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
export type QuotationStatus = 'Draft' | 'Sent' | 'Viewed' | 'Approval Pending' | 'Approved' | 'Accepted' | 'Rejected' | 'Expired';
export type DocumentStatus = InvoiceStatus | QuotationStatus;


export interface Document {
    id: string;
    docNumber: string;
    type: DocumentType;
    clientId: string;
    issueDate: string;
    dueDate: string;
    validityDate?: string | null;
    items: LineItem[];
    terms?: string;
    notes?: string;
    paymentTerms?: string;
    currency?: string;
    attachments?: string[];
    status: DocumentStatus;
    paidAmount?: number;
    creditApplied?: number;
    revision?: number;
}

export type UserRole = 'admin' | 'manager' | 'staff' | 'sales' | 'accounts' | 'viewer';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyId: string;
}

export interface AppContextType {
    isAuthenticated: boolean;
    loading: boolean;
    currentUser: User | null;
    companyInfo: CompanyInfo | null;
    clients: Client[];
    documents: Document[];
    login: (email: string, password: string) => Promise<boolean>;
    signup: (payload: { name: string; email: string; password: string; companyName?: string }) => Promise<boolean>;
    logout: () => void;
    updateCompanyInfo: (info: CompanyInfo) => Promise<void>;
    addClient: (client: Omit<Client, 'id'>) => Promise<void>;
    updateClient: (client: Client) => Promise<void>;
    getClientById: (id: string) => Client | undefined;
    addDocument: (doc: Omit<Document, 'id' | 'docNumber'>) => Promise<Document | undefined>;
    updateDocument: (doc: Document) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    updateDocumentStatus: (id: string, status: DocumentStatus, force?: boolean) => Promise<void>;
    convertQuoteToInvoice: (quoteId: string, payload?: { items?: { lineItemId: string; quantity: number }[]; callbackPath?: string }) => Promise<Document | undefined>;
}
