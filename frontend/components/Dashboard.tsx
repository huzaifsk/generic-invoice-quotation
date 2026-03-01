import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { HugeiconsIcon } from '@hugeicons/react';
import { ClockIcon, MoneyIcon, NoteIcon } from '@hugeicons/core-free-icons';
import { Document } from '../types';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600">
            {icon}
        </div>
        <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500">{title}</p>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
    </div>
));

const getStatusTone = (status: Document['status']) => {
    if (status === 'Paid' || status === 'Approved' || status === 'Accepted') {
        return 'text-emerald-700 border border-emerald-200 bg-emerald-50';
    }
    if (status === 'Overdue' || status === 'Rejected' || status === 'Cancelled') {
        return 'text-rose-700 border border-rose-200 bg-rose-50';
    }
    if (status === 'Partially Paid' || status === 'Approval Pending') {
        return 'text-amber-700 border border-amber-200 bg-amber-50';
    }
    if (status === 'Sent' || status === 'Viewed') {
        return 'text-blue-700 border border-blue-200 bg-blue-50';
    }
    return 'text-slate-600 border border-slate-200 bg-slate-50';
};
const getTypeTone = (type: Document['type']) =>
    type === 'invoice'
        ? 'text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em]'
        : 'text-blue-700 border border-blue-200 bg-blue-50 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em]';

const Dashboard: React.FC<{ onEditDocument: (doc: Document) => void }> = React.memo(({ onEditDocument }) => {
    const { documents, getClientById, companyInfo } = useAppContext();
    const navigate = useNavigate();

    const getGrandTotal = useCallback((doc: Document) => {
        const fallbackTaxPercent = Number(companyInfo?.defaultTaxPercent ?? companyInfo?.vatPercent ?? 0);
        return doc.items.reduce((acc, item) => {
            const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
            const taxPercent = Number.isFinite(Number(item.taxPercent)) ? Number(item.taxPercent) : fallbackTaxPercent;
            return acc + subtotal + (subtotal * taxPercent / 100);
        }, 0);
    }, [companyInfo]);

    const financials = useMemo(() => {
        const invoices = documents.filter(d => d.type === 'invoice');

        const calcTotal = (doc: Document) => getGrandTotal(doc);

        const totalRevenue = invoices
            .filter(inv => inv.status === 'Paid')
            .reduce((sum, inv) => sum + calcTotal(inv), 0);

        const outstandingAmount = invoices
            .filter(inv => inv.status === 'Sent' || inv.status === 'Overdue')
            .reduce((sum, inv) => sum + getGrandTotal(inv), 0);

        const draftInvoicesCount = invoices.filter(inv => inv.status === 'Draft').length;

        return { totalRevenue, outstandingAmount, draftInvoicesCount };
    }, [documents, getGrandTotal]);

    const recentDocuments = useMemo(() => {
        return [...documents]
            .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
            .slice(0, 5);
    }, [documents]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: companyInfo?.currency || 'AED' }).format(amount);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Overview</p>
                <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(financials.totalRevenue)}
                    icon={
                        <HugeiconsIcon icon={MoneyIcon} size={24} className="h-6 w-6" aria-hidden />
                    }
                />
                <StatCard
                    title="Outstanding"
                    value={formatCurrency(financials.outstandingAmount)}
                    icon={
                        <HugeiconsIcon icon={ClockIcon} size={24} className="h-6 w-6" aria-hidden />
                    }
                />
                <StatCard
                    title="Drafts"
                    value={financials.draftInvoicesCount.toString()}
                    icon={
                        <HugeiconsIcon icon={NoteIcon} size={24} className="h-6 w-6" aria-hidden />
                    }
                />
            </div>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Activity</p>
                        <h2 className="text-2xl font-semibold text-slate-900">Recent Documents</h2>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Doc #</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Type</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Client</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Amount</th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentDocuments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                                            No recent documents to show.
                                        </td>
                                    </tr>
                                ) : (
                                    recentDocuments.map(doc => {
                                        const client = getClientById(doc.clientId);
                                        const grandTotal = getGrandTotal(doc);

                                        return (
                                            <tr
                                                key={doc.id}
                                                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                                                onClick={() => onEditDocument(doc)}
                                            >
                                                <td className="px-4 py-4 text-sm font-medium text-slate-900">{doc.docNumber}</td>
                                                <td className="px-4 py-4">
                                                    <span className={getTypeTone(doc.type)}>{doc.type}</span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-700">{client?.name || 'N/A'}</td>
                                                <td className="px-4 py-4 text-sm font-mono text-slate-900">{formatCurrency(grandTotal)}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${getStatusTone(doc.status)}`}>
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
            </section>
        </div>
    );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
