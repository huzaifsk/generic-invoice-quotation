
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Client, Document } from '../types';
import ClientForm from './ClientForm';

const ClientCard: React.FC<{ client: Client; onEdit: (client: Client) => void, outstanding: number }> = ({ client, onEdit, outstanding }) => (
    <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl p-6 flex flex-col justify-between space-y-4">
        <div>
            <h3 className="text-xl font-bold text-white">{client.name}</h3>
            <p className="text-sm text-blue-400">{client.email}</p>
            <p className="text-sm text-gray-300 mt-2">{client.address}</p>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-100/10">
            <div>
                <p className="text-xs text-gray-400">Outstanding</p>
                <p className="font-semibold text-lg text-white">{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(outstanding)}</p>
            </div>
            <button onClick={() => onEdit(client)} className="text-sm bg-blue-600/50 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md transition">Edit</button>
        </div>
    </div>
);

const ClientList: React.FC = () => {
    const { clients, documents, companyInfo } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const getGrandTotal = (doc: Document) => {
        const subtotal = doc.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
        const vat = subtotal * ((companyInfo?.vatPercent || 0) / 100);
        return subtotal + vat;
    };

    const clientDebts = useMemo(() => {
        const debts = new Map<string, number>();
        documents.filter(doc => doc.type === 'invoice' && (doc.status === 'Sent' || doc.status === 'Overdue')).forEach(doc => {
            const total = getGrandTotal(doc);
            debts.set(doc.clientId, (debts.get(doc.clientId) || 0) + total);
        });
        return debts;
    }, [documents, companyInfo]);

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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Clients</h1>
                <button onClick={handleNewClient} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                    + Add New Client
                </button>
            </div>

            <div className="relative">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/70 border border-slate-100/10 rounded-lg py-3 px-4 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            {filteredClients.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <ClientCard 
                            key={client.id} 
                            client={client} 
                            onEdit={handleEditClient}
                            outstanding={clientDebts.get(client.id) || 0}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl">
                    <h3 className="text-xl font-semibold text-white">No Clients Found</h3>
                    <p className="text-gray-400 mt-2">{searchTerm ? 'Try adjusting your search.' : 'Click "Add New Client" to get started.'}</p>
                </div>
            )}


            {isModalOpen && <ClientForm client={editingClient} onClose={handleCloseModal} />}
        </div>
    );
};

export default ClientList;
