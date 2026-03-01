import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const ActivityLog: React.FC = () => {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await api.getActivities({ limit: 200 });
                setRows(data);
                setError('');
            } catch {
                setError('Failed to load activities.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Compliance</p>
                <h1 className="text-3xl font-semibold text-slate-900">Activity Log</h1>
            </div>

            {error && <p className="text-sm text-slate-600">{error}</p>}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Time</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Action</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Entity</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">User</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={4}>Loading...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={4}>No activity found.</td></tr>
                            ) : rows.map((row) => (
                                <tr key={row.id} className="border-t border-slate-100">
                                    <td className="px-4 py-4 text-sm text-slate-900">{new Date(row.createdAt).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700">{row.action}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700">{row.entityType}:{row.entityId}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700">{row.userId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ActivityLog;
