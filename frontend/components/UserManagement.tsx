import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { UserRole } from '../types';

interface ManagedUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

const roles: UserRole[] = ['admin', 'sales', 'accounts', 'viewer', 'manager', 'staff'];

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' as UserRole });

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
            setError('');
        } catch {
            setError('Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const normalizedName = form.name.trim();
        const normalizedEmail = form.email.trim().toLowerCase();

        if (normalizedName.length < 2) {
            setError('Name must be at least 2 characters.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setError('Please enter a valid email.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        try {
            setSubmitting(true);
            await api.createUser({ ...form, name: normalizedName, email: normalizedEmail });
            setForm({ name: '', email: '', password: '', role: 'staff' });
            setSuccess('User created successfully.');
            await loadUsers();
        } catch {
            setError('Failed to create user.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRoleChange = async (id: string, role: UserRole) => {
        try {
            setError('');
            const updated = await api.updateUserRole(id, role);
            setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
            setSuccess('Role updated.');
        } catch {
            setError('Failed to update role.');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Admin</p>
                <h1 className="text-3xl font-semibold text-slate-900">User & Role Management</h1>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4 bg-white border border-slate-200 rounded-2xl p-5">
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} required />
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
                <div className="flex flex-col sm:flex-row gap-3">
                    <select className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                        {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <button className="ui-btn-primary ui-focus-ring px-4 py-2 w-full sm:w-auto" type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add'}</button>
                </div>
            </form>

            {error && <p className="text-sm text-slate-600">{error}</p>}
            {success && <p className="text-sm text-slate-500">{success}</p>}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Name</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Email</th>
                            <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="px-4 py-5 text-sm text-slate-500" colSpan={3}>Loading users...</td></tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="border-t border-slate-100">
                                    <td className="px-4 py-4 text-sm text-slate-900">{user.name}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700">{user.email}</td>
                                    <td className="px-4 py-4">
                                        <select
                                            className="border border-slate-200 rounded-lg px-2 py-1 text-sm"
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                        >
                                            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
