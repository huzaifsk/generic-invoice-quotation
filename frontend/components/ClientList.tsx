
import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Client, Document } from '../types';
import { HugeiconsIcon } from '@hugeicons/react';
import { SearchIcon } from '@hugeicons/core-free-icons';
import ClientForm from './ClientForm';

const ClientCard: React.FC<{ client: Client; onEdit: (client: Client) => void; outstanding: number; currency: string }> = React.memo(
    ({ client, onEdit, outstanding, currency }) => (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div>
                <h3 className="text-xl font-semibold text-slate-900">{client.name}</h3>
                <p className="text-sm text-slate-500">{client.email}</p>
                <p className="text-sm text-slate-500 mt-2">{client.address}</p>
            </div>
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Outstanding</p>
                    <p className="text-lg font-semibold text-slate-900">{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(outstanding)}</p>
                </div>
                <button onClick={() => onEdit(client)} className="ui-btn-ghost ui-focus-ring px-3 py-1.5 text-xs">
                    Edit
                </button>
            </div>
        </div>
    )
);

ClientCard.displayName = 'ClientCard';

const ClientList: React.FC = React.memo(() => {
    const { clients, documents, companyInfo } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const getGrandTotal = useCallback((doc: Document) => {
        const fallbackTaxPercent = Number(companyInfo?.defaultTaxPercent ?? companyInfo?.vatPercent ?? 0);
        return doc.items.reduce((acc, item) => {
            const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
            const taxPercent = Number.isFinite(Number(item.taxPercent)) ? Number(item.taxPercent) : fallbackTaxPercent;
            return acc + subtotal + (subtotal * taxPercent / 100);
        }, 0);
    }, [companyInfo]);

    const clientDebts = useMemo(() => {
        const debts = new Map<string, number>();
        documents.filter(doc => doc.type === 'invoice' && (doc.status === 'Sent' || doc.status === 'Overdue')).forEach(doc => {
            const total = getGrandTotal(doc);
            debts.set(doc.clientId, (debts.get(doc.clientId) || 0) + total);
        });
        return debts;
    }, [documents, getGrandTotal]);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clients, searchTerm]);

    const handleNewClient = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Directory</p>
                    <h1 className="text-3xl font-semibold text-slate-900">Clients</h1>
                </div>
                <button
                    onClick={handleNewClient}
                    className="ui-btn-primary ui-focus-ring px-5 py-2.5"
                >
                    + Add New Client
                </button>
            </div>

            <div className="relative">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <HugeiconsIcon icon={SearchIcon} size={18} className="h-5 w-5 text-current" aria-hidden />
                </div>
            </div>

            {filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            onEdit={handleEditClient}
                            outstanding={clientDebts.get(client.id) || 0}
                            currency={companyInfo?.currency || 'AED'}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border border-slate-200 rounded-2xl bg-white">
                    <h3 className="text-xl font-semibold text-slate-900">No Clients Found</h3>
                    <p className="text-sm text-slate-500 mt-2">{searchTerm ? 'Try adjusting your search.' : 'Click "Add New Client" to get started.'}</p>
                </div>
            )}

            {isModalOpen && <ClientForm client={editingClient} onClose={handleCloseModal} />}
        </div>
    );
});

ClientList.displayName = 'ClientList';

export default ClientList;
