import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { UserRole } from '../types';
import { api } from '../services/api';
import { applyTheme, getStoredTheme, ThemeName } from '../utils/theme';

interface ManagedUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

const ROLE_OPTIONS: UserRole[] = ['admin', 'manager', 'staff', 'sales', 'accounts', 'viewer'];

const DEFAULT_ROLE_RIGHTS: Record<UserRole, string[]> = {
    admin: ['*'],
    manager: ['*'],
    sales: [
        'clients:read', 'clients:write',
        'catalog:read', 'catalog:write',
        'documents:read', 'documents:write', 'documents:status', 'documents:convert', 'documents:approve',
        'reports:read',
        'notifications:read',
        'activities:read',
    ],
    staff: [
        'clients:read', 'clients:write',
        'catalog:read', 'catalog:write',
        'documents:read', 'documents:write', 'documents:status',
        'reports:read',
        'activities:read',
    ],
    accounts: [
        'clients:read',
        'catalog:read',
        'documents:read', 'documents:status',
        'payments:read', 'payments:write',
        'creditnotes:read', 'creditnotes:write',
        'reports:read',
        'notifications:read', 'notifications:write',
        'activities:read',
    ],
    viewer: [
        'clients:read',
        'catalog:read',
        'documents:read',
        'reports:read',
        'activities:read',
    ],
};

const ALL_PERMISSIONS = Array.from(
    new Set(
        Object.values(DEFAULT_ROLE_RIGHTS)
            .flat()
            .filter((permission) => permission !== '*')
    )
).sort();

const CURRENCY_OPTIONS = ['AED', 'USD', 'EUR', 'GBP', 'INR', 'SAR', 'QAR'];

const normalizeRoleRights = (raw?: unknown): Record<UserRole, string[]> => {
    const base: Record<UserRole, string[]> = {
        admin: [...DEFAULT_ROLE_RIGHTS.admin],
        manager: [...DEFAULT_ROLE_RIGHTS.manager],
        staff: [...DEFAULT_ROLE_RIGHTS.staff],
        sales: [...DEFAULT_ROLE_RIGHTS.sales],
        accounts: [...DEFAULT_ROLE_RIGHTS.accounts],
        viewer: [...DEFAULT_ROLE_RIGHTS.viewer],
    };

    if (!raw || typeof raw !== 'object') {
        return base;
    }

    for (const role of ROLE_OPTIONS) {
        const rolePermissions = (raw as Record<string, unknown>)[role];
        if (Array.isArray(rolePermissions)) {
            const sanitized = rolePermissions
                .map((permission) => String(permission))
                .filter((permission) => permission === '*' || ALL_PERMISSIONS.includes(permission));
            if (sanitized.length) {
                base[role] = sanitized;
            }
        }
    }

    return base;
};

const Settings: React.FC = () => {
    const { companyInfo, updateCompanyInfo, currentUser } = useAppContext();
    const [theme, setTheme] = useState<ThemeName>('light');
    const [currency, setCurrency] = useState('AED');
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
    const [roleRights, setRoleRights] = useState<Record<UserRole, string[]>>(() =>
        normalizeRoleRights(companyInfo?.templates?.rolePermissions)
    );
    const [savingPreferences, setSavingPreferences] = useState(false);
    const [savingRights, setSavingRights] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const canManageAccess = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    useEffect(() => {
        const persistedTheme = companyInfo?.templates?.theme || getStoredTheme() || 'light';
        setTheme(persistedTheme);
        applyTheme(persistedTheme);

        setCurrency(companyInfo?.currency || 'AED');
        setRoleRights(normalizeRoleRights(companyInfo?.templates?.rolePermissions));
    }, [companyInfo]);

    useEffect(() => {
        if (!canManageAccess) {
            setUsers([]);
            return;
        }

        const loadUsers = async () => {
            try {
                setUsersLoading(true);
                const data = await api.getUsers();
                setUsers(data);
            } catch {
                setError('Failed to load users for role management.');
            } finally {
                setUsersLoading(false);
            }
        };

        loadUsers();
    }, [canManageAccess]);

    const selectedRoleRights = useMemo(() => roleRights[selectedRole] || [], [roleRights, selectedRole]);
    const selectedRoleHasFullAccess = selectedRoleRights.includes('*');

    const savePreferences = async () => {
        if (!companyInfo) return;

        setError('');
        setMessage('');
        setSavingPreferences(true);
        try {
            await updateCompanyInfo({
                ...companyInfo,
                currency,
                templates: {
                    ...(companyInfo.templates || {}),
                    theme,
                },
            });
            applyTheme(theme);
            setMessage('Theme and currency settings updated.');
        } catch {
            setError('Failed to save theme and currency settings.');
        } finally {
            setSavingPreferences(false);
        }
    };

    const updateUserRole = async (userId: string, role: UserRole) => {
        try {
            setError('');
            setMessage('');
            const updated = await api.updateUserRole(userId, role);
            setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
            setMessage('User role updated.');
        } catch {
            setError('Failed to update user role.');
        }
    };

    const togglePermission = (permission: string) => {
        if (selectedRoleHasFullAccess) return;

        setRoleRights((prev) => {
            const current = new Set(prev[selectedRole] || []);
            if (current.has(permission)) {
                current.delete(permission);
            } else {
                current.add(permission);
            }

            return {
                ...prev,
                [selectedRole]: Array.from(current).sort(),
            };
        });
    };

    const resetRoleRights = () => {
        setRoleRights((prev) => ({
            ...prev,
            [selectedRole]: [...DEFAULT_ROLE_RIGHTS[selectedRole]],
        }));
    };

    const saveRoleRights = async () => {
        if (!companyInfo || !canManageAccess) return;

        setError('');
        setMessage('');
        setSavingRights(true);
        try {
            await updateCompanyInfo({
                ...companyInfo,
                templates: {
                    ...(companyInfo.templates || {}),
                    rolePermissions: roleRights,
                },
            });
            setMessage('Role rights settings saved.');
        } catch {
            setError('Failed to save role rights settings.');
        } finally {
            setSavingRights(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Admin</p>
                <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
                <p className="mt-1 text-sm text-slate-500">Manage roles, rights, theme, and currency in one place.</p>
            </div>

            {error && <p className="text-sm text-slate-600">{error}</p>}
            {message && <p className="text-sm text-slate-500">{message}</p>}

            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Appearance & Finance</p>
                    <h2 className="text-xl font-semibold text-slate-900 mt-1">Theme & Currency</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-3">
                        <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Theme</label>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setTheme('light');
                                    applyTheme('light');
                                }}
                                className={`${theme === 'light' ? 'ui-btn-primary' : 'ui-btn-secondary'} ui-focus-ring px-4 py-2`}
                            >
                                Light
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTheme('dark');
                                    applyTheme('dark');
                                }}
                                className={`${theme === 'dark' ? 'ui-btn-primary' : 'ui-btn-secondary'} ui-focus-ring px-4 py-2`}
                            >
                                Dark
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label htmlFor="currency" className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Default Currency</label>
                        <select
                            id="currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                        >
                            {CURRENCY_OPTIONS.map((code) => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        className="ui-btn-primary ui-focus-ring px-5 py-2.5"
                        onClick={savePreferences}
                        disabled={savingPreferences}
                    >
                        {savingPreferences ? 'Saving...' : 'Save Theme & Currency'}
                    </button>
                </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Access Control</p>
                    <h2 className="text-xl font-semibold text-slate-900 mt-1">Roles & Rights</h2>
                </div>

                {!canManageAccess ? (
                    <p className="text-sm text-slate-500">Only admin and manager roles can manage users and rights.</p>
                ) : (
                    <>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="min-w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Name</th>
                                        <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Email</th>
                                        <th className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">Role</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersLoading ? (
                                        <tr>
                                            <td className="px-4 py-5 text-sm text-slate-500" colSpan={3}>Loading users...</td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td className="px-4 py-5 text-sm text-slate-500" colSpan={3}>No users found.</td>
                                        </tr>
                                    ) : users.map((user) => (
                                        <tr key={user.id} className="border-t border-slate-100">
                                            <td className="px-4 py-4 text-sm text-slate-900">{user.name}</td>
                                            <td className="px-4 py-4 text-sm text-slate-700">{user.email}</td>
                                            <td className="px-4 py-4">
                                                <select
                                                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm"
                                                    value={user.role}
                                                    onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                                >
                                                    {ROLE_OPTIONS.map((role) => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Role Rights Editor</p>
                                    <p className="text-sm text-slate-500 mt-1">Choose a role and adjust allowed rights.</p>
                                </div>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                >
                                    {ROLE_OPTIONS.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedRoleHasFullAccess ? (
                                <p className="text-sm text-slate-500">This role has full access (`*`).</p>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {ALL_PERMISSIONS.map((permission) => {
                                        const checked = selectedRoleRights.includes(permission);
                                        return (
                                            <label key={permission} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => togglePermission(permission)}
                                                    className="h-4 w-4"
                                                />
                                                <span>{permission}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex flex-wrap justify-end gap-3">
                                <button type="button" className="ui-btn-secondary ui-focus-ring px-4 py-2" onClick={resetRoleRights}>
                                    Reset Role Defaults
                                </button>
                                <button
                                    type="button"
                                    className="ui-btn-primary ui-focus-ring px-4 py-2"
                                    onClick={saveRoleRights}
                                    disabled={savingRights}
                                >
                                    {savingRights ? 'Saving...' : 'Save Role Rights'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default Settings;
