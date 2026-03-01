import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { api } from '../services/api';

const Payments: React.FC = () => {
    const { documents } = useAppContext();
    const invoices = useMemo(() => documents.filter((doc) => doc.type === 'invoice'), [documents]);
    const [payments, setPayments] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ invoiceId: '', amount: '', method: 'bank', referenceId: '' });

    const loadPayments = async () => {
        try {
            setLoading(true);
            const data = await api.getPayments();
            setPayments(data);
            setError('');
        } catch {
            setError('Failed to load payments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayments();
    }, []);

    const handleRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.invoiceId) {
            setError('Select an invoice.');
            return;
        }

        try {
            await api.recordPayment({
                invoiceId: form.invoiceId,
                amount: Number(form.amount),
                method: form.method,
                referenceId: form.referenceId,
            });
            setForm({ invoiceId: '', amount: '', method: 'bank', referenceId: '' });
            await loadPayments();
        } catch (e: any) {
            setError(e?.message || 'Failed to record payment.');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Accounts</p>
                <h1 className="text-3xl font-semibold text-slate-900">Payments</h1>
            </div>

            <form onSubmit={handleRecord} className="grid gap-4 md:grid-cols-4 bg-white border border-slate-200 rounded-2xl p-5">
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
                    <option value="">Select invoice</option>
                    {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>{inv.docNumber} ({inv.status})</option>
                    ))}
                </select>
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" type="number" min={0.01} step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    <option value="bank">Bank</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="gateway">Gateway</option>
                </select>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Reference ID" value={form.referenceId} onChange={(e) => setForm({ ...form, referenceId: e.target.value })} />
                    <button className="ui-btn-primary ui-focus-ring px-4 py-2 w-full sm:w-auto" type="submit">Record</button>
                </div>
            </form>

            {error && <p className="text-sm text-slate-600">{error}</p>}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Receipt</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Invoice</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Amount</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={4}>Loading...</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={4}>No payments yet.</td></tr>
                        ) : payments.map((payment) => (
                            <tr key={payment.id} className="border-t border-slate-100">
                                <td className="px-4 py-4 text-sm text-slate-900">{payment.receiptNumber}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{payment.invoiceId}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{Number(payment.amount).toFixed(2)}</td>
                                <td className="px-4 py-4 text-sm text-slate-700 capitalize">{payment.method}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default Payments;
