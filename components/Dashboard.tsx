
import React, { useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Document, InvoiceStatus } from '../types';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
    <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl p-6 flex items-center space-x-4">
        <div className="p-3 bg-blue-500/20 rounded-lg">{icon}</div>
        <div>
            <p className="text-gray-300 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Paid':
        case 'Accepted':
            return 'bg-green-500/20 text-green-400';
        case 'Sent':
            return 'bg-blue-500/20 text-blue-400';
        case 'Overdue':
        case 'Rejected':
            return 'bg-red-500/20 text-red-400';
        case 'Draft':
        default:
            return 'bg-gray-500/20 text-gray-400';
    }
};

const Dashboard: React.FC<{ onEditDocument: (doc: Document) => void }> = ({ onEditDocument }) => {
    const { documents, getClientById, companyInfo } = useAppContext();

    const getGrandTotal = (doc: Document) => {
        const subtotal = doc.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
        const vat = subtotal * ((companyInfo?.vatPercent || 0) / 100);
        return subtotal + vat;
    };

    const financials = useMemo(() => {
        const invoices = documents.filter(d => d.type === 'invoice');
        
        const calcSubtotal = (doc: Document) => doc.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

        const totalRevenue = invoices
            .filter(inv => inv.status === 'Paid')
            .reduce((sum, inv) => sum + calcSubtotal(inv), 0);

        const outstandingAmount = invoices
            .filter(inv => inv.status === 'Sent' || inv.status === 'Overdue')
            .reduce((sum, inv) => sum + getGrandTotal(inv), 0);
            
        const draftInvoicesCount = invoices.filter(inv => inv.status === 'Draft').length;

        return { totalRevenue, outstandingAmount, draftInvoicesCount };
    }, [documents, companyInfo]);

    const recentDocuments = useMemo(() => {
        return [...documents]
            .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
            .slice(0, 5);
    }, [documents]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Revenue (pre-VAT)" value={formatCurrency(financials.totalRevenue)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 13v-1m-4-1c-.246.34-.49.684-.724 1.031M8 17a9 9 0 0111.95-6.299M4.05 10.299A9.002 9.002 0 0112 5" /></svg>} />
                <StatCard title="Outstanding Amount" value={formatCurrency(financials.outstandingAmount)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Draft Invoices" value={financials.draftInvoicesCount.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
                <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100/10">
                                    <th className="p-4 text-sm font-semibold text-gray-300">Doc #</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Type</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Client</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Amount</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentDocuments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center p-8 text-gray-400">
                                            No recent documents to show.
                                        </td>
                                    </tr>
                                ) : (
                                    recentDocuments.map(doc => {
                                        const client = getClientById(doc.clientId);
                                        const grandTotal = getGrandTotal(doc);

                                        return (
                                            <tr key={doc.id} className="border-b border-slate-100/10 last:border-b-0 hover:bg-slate-700/50 cursor-pointer" onClick={() => onEditDocument(doc)}>
                                                <td className="p-4 text-blue-400 font-medium">{doc.docNumber}</td>
                                                <td className="p-4 capitalize">{doc.type}</td>
                                                <td className="p-4">{client?.name || 'N/A'}</td>
                                                <td className="p-4 font-mono">{formatCurrency(grandTotal)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                                                        {doc.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
