const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const TOKEN_KEY = 'authToken';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface SignupPayload {
    name: string;
    email: string;
    password: string;
    companyName?: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
    return Boolean(getToken());
}

async function request<T>(path: string, method: HttpMethod = 'GET', body?: unknown): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 204) {
        return undefined as T;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    return data as T;
}

export const api = {
    signup: (payload: SignupPayload) => request<{ token: string; user: any; company: any }>('/auth/signup', 'POST', payload),
    login: (payload: LoginPayload) => request<{ token: string; user: any; company: any }>('/auth/login', 'POST', payload),
    me: () => request<{ user: any; company: any }>('/auth/me'),
    getCompany: () => request<any>('/company/me'),
    updateCompany: (payload: any) => request<any>('/company/me', 'PUT', payload),
    getClients: () => request<any[]>('/clients'),
    createClient: (payload: any) => request<any>('/clients', 'POST', payload),
    updateClient: (id: string, payload: any) => request<any>(`/clients/${id}`, 'PUT', payload),
    getDocuments: () => request<any[]>('/documents'),
    createDocument: (payload: any) => request<any>('/documents', 'POST', payload),
    updateDocument: (id: string, payload: any) => request<any>(`/documents/${id}`, 'PUT', payload),
    deleteDocument: (id: string) => request<void>(`/documents/${id}`, 'DELETE'),
    updateDocumentStatus: (id: string, status: string, force = false) => request<any>(`/documents/${id}/status`, 'PATCH', { status, force }),
    convertQuoteToInvoice: (id: string, payload?: { items?: { lineItemId: string; quantity: number }[]; callbackPath?: string }) => request<any>(`/documents/${id}/convert`, 'POST', payload || {}),
    getUsers: () => request<any[]>('/users'),
    createUser: (payload: { name: string; email: string; password: string; role: string }) => request<any>('/users', 'POST', payload),
    updateUserRole: (id: string, role: string) => request<any>(`/users/${id}/role`, 'PATCH', { role }),
    getReportOverview: () => request<{ totalRevenue: number; totalUnpaid: number; totalVatCollected: number; monthlyRevenue: { name: string; revenue: number }[] }>('/reports/overview'),
    getAgingReport: () => request<any>('/reports/aging'),
    getTaxReport: (period?: string) => request<any>(`/reports/tax${period ? `?period=${encodeURIComponent(period)}` : ''}`),
    getCatalog: () => request<any[]>('/catalog'),
    createCatalogItem: (payload: any) => request<any>('/catalog', 'POST', payload),
    updateCatalogItem: (id: string, payload: any) => request<any>(`/catalog/${id}`, 'PUT', payload),
    deleteCatalogItem: (id: string) => request<void>(`/catalog/${id}`, 'DELETE'),
    getPayments: (invoiceId?: string) => request<any[]>(`/payments${invoiceId ? `?invoiceId=${encodeURIComponent(invoiceId)}` : ''}`),
    recordPayment: (payload: any) => request<any>('/payments', 'POST', payload),
    getPaymentReceipt: (id: string) => request<any>(`/payments/${id}/receipt`),
    getCreditNotes: () => request<any[]>('/credit-notes'),
    createCreditNote: (payload: any) => request<any>('/credit-notes', 'POST', payload),
    getNotifications: () => request<any[]>('/notifications'),
    scheduleNotification: (payload: any) => request<any>('/notifications/schedule', 'POST', payload),
    dispatchNotification: (id: string) => request<any>(`/notifications/${id}/dispatch`, 'POST'),
    getActivities: (params?: { entityType?: string; entityId?: string; action?: string; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.entityType) qs.set('entityType', params.entityType);
        if (params?.entityId) qs.set('entityId', params.entityId);
        if (params?.action) qs.set('action', params.action);
        if (params?.limit) qs.set('limit', String(params.limit));
        return request<any[]>(`/activities${qs.toString() ? `?${qs.toString()}` : ''}`);
    },
};
