import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface CatalogItem {
    id: string;
    sku: string;
    name: string;
    sellPrice: number;
    taxPercent: number;
    unit: string;
}

const Catalog: React.FC = () => {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ sku: '', name: '', sellPrice: '', taxPercent: '0', unit: 'unit' });

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await api.getCatalog();
            setItems(data);
            setError('');
        } catch {
            setError('Failed to load catalog.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) {
            setError('Item name is required.');
            return;
        }

        try {
            await api.createCatalogItem({
                sku: form.sku.trim() || undefined,
                name: form.name.trim(),
                sellPrice: Number(form.sellPrice || 0),
                taxPercent: Number(form.taxPercent || 0),
                unit: form.unit.trim() || 'unit',
            });
            setForm({ sku: '', name: '', sellPrice: '', taxPercent: '0', unit: 'unit' });
            await loadItems();
        } catch {
            setError('Failed to create catalog item.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteCatalogItem(id);
            setItems((prev) => prev.filter((item) => item.id !== id));
        } catch {
            setError('Failed to delete item.');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Catalog</p>
                <h1 className="text-3xl font-semibold text-slate-900">Products & Services</h1>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-5 bg-white border border-slate-200 rounded-2xl p-5">
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" type="number" min={0} step="0.01" placeholder="Sell Price" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" type="number" min={0} max={100} step="0.01" placeholder="Tax %" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })} />
                <div className="flex flex-col sm:flex-row gap-3">
                    <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                    <button className="ui-btn-primary ui-focus-ring px-4 py-2 w-full sm:w-auto" type="submit">Add</button>
                </div>
            </form>

            {error && <p className="text-sm text-slate-600">{error}</p>}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">SKU</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Name</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Price</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Tax</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={5}>Loading...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={5}>No items yet.</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                                <td className="px-4 py-4 text-sm text-slate-900">{item.sku}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{item.name}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{Number(item.sellPrice).toFixed(2)}</td>
                                <td className="px-4 py-4 text-sm text-slate-700">{Number(item.taxPercent).toFixed(2)}%</td>
                                <td className="px-4 py-4 text-sm text-right">
                                    <button className="ui-btn-ghost ui-focus-ring px-3 py-1.5 text-xs" onClick={() => handleDelete(item.id)} type="button">Delete</button>
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

export default Catalog;
