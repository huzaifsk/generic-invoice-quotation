import React, { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Client } from '../types';
import { HugeiconsIcon } from '@hugeicons/react';
import { CancelIcon } from '@hugeicons/core-free-icons';

interface ClientFormProps {
    client: Client | null;
    onClose: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ client, onClose }) => {
    const { addClient, updateClient } = useAppContext();
    const [formData, setFormData] = useState({ name: '', email: '', address: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (client) {
            setFormData({ name: client.name, email: client.email, address: client.address });
        }
    }, [client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const normalizedName = formData.name.trim();
        const normalizedEmail = formData.email.trim().toLowerCase();
        const normalizedAddress = formData.address.trim();

        if (normalizedName.length < 2) {
            setError('Client name must be at least 2 characters.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setError('Please enter a valid client email.');
            return;
        }
        if (normalizedAddress.length < 5) {
            setError('Address must be at least 5 characters.');
            return;
        }

        try {
            setSubmitting(true);
            if (client) {
                await updateClient({ ...client, name: normalizedName, email: normalizedEmail, address: normalizedAddress });
            } else {
                await addClient({ name: normalizedName, email: normalizedEmail, address: normalizedAddress });
            }
            onClose();
        } catch {
            setError('Failed to save client.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = 'mt-1 block w-full border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none';
    const ghostButton = 'ui-btn-secondary ui-focus-ring px-4 py-2';
    const primaryButton = 'ui-btn-primary ui-focus-ring px-4 py-2';

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 relative">
                <button onClick={onClose} type="button" className="ui-focus-ring absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:text-slate-800">
                    <HugeiconsIcon icon={CancelIcon} size={20} className="h-6 w-6" aria-hidden />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{client ? 'Edit Client' : 'Add New Client'}</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required minLength={2} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Email</label>
                        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Address</label>
                        <textarea name="address" id="address" value={formData.address} onChange={handleChange} required minLength={5} rows={3} className={inputClass}></textarea>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-end pt-2">
                        <button type="button" onClick={onClose} className={ghostButton}>
                            Cancel
                        </button>
                        <button type="submit" className={primaryButton} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    {error && <p className="text-xs text-slate-600">{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default ClientForm;
