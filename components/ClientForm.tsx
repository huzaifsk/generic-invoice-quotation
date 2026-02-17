
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Client } from '../types';

interface ClientFormProps {
    client: Client | null;
    onClose: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ client, onClose }) => {
    const { addClient, updateClient } = useAppContext();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        address: '',
    });

    useEffect(() => {
        if (client) {
            setFormData({ name: client.name, email: client.email, address: client.address });
        }
    }, [client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (client) {
            updateClient({ ...client, ...formData });
        } else {
            addClient(formData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg bg-slate-900/80 backdrop-blur-lg border border-slate-100/10 rounded-2xl shadow-lg p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">{client ? 'Edit Client' : 'Add New Client'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label>
                        <textarea name="address" id="address" value={formData.address} onChange={handleChange} required rows={3} className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-600/50 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition mr-2">
                            Cancel
                        </button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                            {client ? 'Save Changes' : 'Add Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientForm;
