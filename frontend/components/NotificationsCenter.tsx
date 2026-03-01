import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const getNotificationStatusTone = (status: string) => {
    const value = String(status || '').toLowerCase();
    if (value === 'sent' || value === 'dispatched' || value === 'delivered') {
        return 'text-emerald-700 border border-emerald-200 bg-emerald-50';
    }
    if (value === 'failed' || value === 'cancelled') {
        return 'text-rose-700 border border-rose-200 bg-rose-50';
    }
    if (value === 'scheduled' || value === 'queued' || value === 'pending') {
        return 'text-amber-700 border border-amber-200 bg-amber-50';
    }
    return 'text-slate-600 border border-slate-200 bg-slate-50';
};

const NotificationsCenter: React.FC = () => {
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ eventType: 'invoice.reminder', channel: 'email', recipient: '', sendAt: '' });

    const load = async () => {
        try {
            const data = await api.getNotifications();
            setRows(data);
            setError('');
        } catch {
            setError('Failed to load notifications.');
        }
    };

    useEffect(() => {
        load();
    }, []);

    const schedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.scheduleNotification(form);
            setForm({ ...form, recipient: '', sendAt: '' });
            await load();
        } catch {
            setError('Failed to schedule notification.');
        }
    };

    const dispatchNow = async (id: string) => {
        try {
            await api.dispatchNotification(id);
            await load();
        } catch {
            setError('Failed to dispatch notification.');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Automation</p>
                <h1 className="text-3xl font-semibold text-slate-900">Notifications</h1>
            </div>

            <form onSubmit={schedule} className="grid gap-4 md:grid-cols-4 bg-white border border-slate-200 rounded-2xl p-5">
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Event Type" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} required />
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                </select>
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} required />
                <div className="flex flex-col sm:flex-row gap-3">
                    <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" type="date" value={form.sendAt} onChange={(e) => setForm({ ...form, sendAt: e.target.value })} required />
                    <button className="ui-btn-primary ui-focus-ring px-4 py-2 w-full sm:w-auto" type="submit">Schedule</button>
                </div>
            </form>

            {error && <p className="text-sm text-slate-600">{error}</p>}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Event</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Recipient</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Schedule</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={4}>No notifications.</td></tr>
                        ) : rows.map((row) => (
                            <tr key={row.id} className="border-t border-slate-100">
                                <td className="px-4 py-4 text-sm text-slate-900">{row.eventType}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{row.recipient}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{row.sendAt}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">
                                    <div className="flex items-center gap-3">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${getNotificationStatusTone(row.status)}`}>
                                            {row.status}
                                        </span>
                                        {row.status !== 'sent' && (
                                            <button className="ui-btn-ghost ui-focus-ring px-3 py-1.5 text-xs" type="button" onClick={() => dispatchNow(row.id)}>Dispatch</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default NotificationsCenter;
