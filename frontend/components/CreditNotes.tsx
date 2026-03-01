import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { api } from '../services/api';

const CreditNotes: React.FC = () => {
    const { documents } = useAppContext();
    const invoices = useMemo(() => documents.filter((doc) => doc.type === 'invoice'), [documents]);
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ invoiceId: '', amount: '', reason: '' });

    const load = async () => {
        try {
            const data = await api.getCreditNotes();
            setCreditNotes(data);
            setError('');
        } catch {
            setError('Failed to load credit notes.');
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.createCreditNote({
                invoiceId: form.invoiceId,
                amount: Number(form.amount),
                reason: form.reason,
            });
            setForm({ invoiceId: '', amount: '', reason: '' });
            await load();
        } catch (e: any) {
            setError(e?.message || 'Failed to create credit note.');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Accounts</p>
                <h1 className="text-3xl font-semibold text-slate-900">Credit Notes</h1>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4 bg-white border border-slate-200 rounded-2xl p-5">
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} required>
                    <option value="">Select invoice</option>
                    {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>{inv.docNumber}</option>
                    ))}
                </select>
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" type="number" min={0.01} step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
                <button className="ui-btn-primary ui-focus-ring px-4 py-2 w-full md:w-auto" type="submit">Issue Credit Note</button>
            </form>

            {error && <p className="text-sm text-slate-600">{error}</p>}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Credit Note #</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Invoice</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Amount</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {creditNotes.length === 0 ? (
                            <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={4}>No credit notes yet.</td></tr>
                        ) : creditNotes.map((note) => (
                            <tr key={note.id} className="border-t border-slate-100">
                                <td className="px-4 py-4 text-sm text-slate-900">{note.creditNoteNumber}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{note.invoiceId}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{Number(note.amount).toFixed(2)}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{note.reason}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default CreditNotes;
